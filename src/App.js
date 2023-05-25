import React, { useEffect, useState } from "react";
import "./App.css";
import { initMap } from "@dstanesc/shared-property-map";
import _, { set } from "lodash";
import { partReport } from "@dstanesc/fake-metrology-data";
import { layout, trace, boxPlot, histogram, violinPlot } from "./plot";

function App() {
  const [button, setButton] = useState("Start e2e");

  const [valueSize, setValueSize] = useState(0);

  const [valueSizeBytes, setValueSizeBytes] = useState([]);

  const [stats, setStats] = useState(null);

  // local view
  const [sharedPropertyMap, setSharedPropertyMap] = useState();

  // remote view
  const [remotePropertyMap, setRemotePropertyMap] = useState();

  // timing

  const [startTimes, setStartTimes] = useState(new Map());

  const [endTimes, setEndTimes] = useState(new Map());

  const [durations, setDurations] = useState(new Map());

  const mapId = window.location.hash.substring(1) || undefined;

  async function init() {
    const sharedMap = await initMap(
      mapId,
      updateLocalModel,
      updateLocalModel,
      deleteLocalModel
    );
    if (mapId === undefined) {
      window.location.hash = sharedMap.mapId();
    }
    setSharedPropertyMap(sharedMap);
    return sharedMap.mapId();
  }

  useEffect(() => {
    init().then((localId) => {
      const remoteView = initMap(
        localId,
        updateRemoteModel,
        updateRemoteModel,
        deleteRemoteModel
      );
      setRemotePropertyMap(remoteView);
    });
  }, []);

  useEffect(() => {
    const keys = Array.from(durations.keys());
    const values = Array.from(durations.values());
    const scatterTrace = trace({ keys, values });
    const boxPlotTrace = boxPlot({ values });
    const histogramTrace = histogram({ values });
    const violinPlotTrace = violinPlot({ values });
    Plotly.newPlot("plotDiv", [scatterTrace], layout("Measurements"));
    var bd = document.getElementById("boxDiv");
    Plotly.newPlot(bd, [boxPlotTrace], { title: "Statistics: Box Plot" });
    Plotly.newPlot("histDiv", [histogramTrace], {
      title: "Statistics: Histogram",
    });
    var vd = document.getElementById("violinDiv");
    Plotly.newPlot(vd, [violinPlotTrace], { title: "Statistics: Violin" });
    bd.on("plotly_hover", (evtData) => {
      var calcData = bd.calcdata;
      evtData.points.forEach((p) => {
        var calcPt0 = calcData[p.curveNumber][0];
        setStats(calcPt0);
      });
    });
  }, [durations]);

  useEffect(() => {
    const times = new Map();
    endTimes.forEach((endTime, key) => {
      const startTime = startTimes.get(key);
      const duration = endTime - startTime;
      times.set(key, duration);
    });
    setDurations(times);
  }, [endTimes]);

  const updateLocalModel = (key, value) => {};

  const deleteLocalModel = (key) => {
    console.log(`Deleting local model ${key}`);
  };

  const updateRemoteModel = (key, value) => {
    const d = new Date();
    const localTime = d.getTime();
    setEndTimes(new Map(endTimes.set(key, localTime)));
    if (key.endsWith(`99`)) setButton(`Start e2e`);
    else setButton(`Running`);
  };

  const deleteRemoteModel = (key) => {
    console.log(`Deleting remote model ${key}`);
    setButton(`Running`);
  };

  const roll = async () => {
    if (sharedPropertyMap) {
      await cleanUp();
      const loops = _.range(100);
      for (const loop of loops) {
        await execFn(rollDice, `${loop}`);
      }
    } else {
      alert("Please wait to initialize");
    }
  };

  const cleanUp = async () => {
    for (const key of startTimes.keys()) {
      await execFn(() => {
        if (sharedPropertyMap.has(key)) {
          sharedPropertyMap.delete(key);
          sharedPropertyMap.commit();
        }
      });
    }
  };

  const execFn = (fn, arg1) => {
    fn(arg1);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, 100);
    });
  };

  const rollDice = (key) => {
    const newValue = generateValue(valueSize);
    const newBytes = computeByteLength(newValue);
    setValueSizeBytes((oldBytes) => [...oldBytes, newBytes]);
    const d = new Date();
    const localTime = d.getTime();
    const newStartTimes = startTimes.set(key, localTime);
    setStartTimes(new Map(newStartTimes));
    sharedPropertyMap.set(key, newValue.toString());
    sharedPropertyMap.commit();
  };

  const messageLatency = () => {
    const values = Array.from(durations.values()).map(Number);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return Number.isFinite(min) ? `min: ${min} ms, max: ${max} ms` : ``;
  };

  const messageByteSize = () => {
    const minBytes = Math.min(...valueSizeBytes);
    const maxBytes = Math.max(...valueSizeBytes);
    return Number.isFinite(minBytes)
      ? `min: ${minBytes} bytes, max: ${maxBytes} bytes`
      : ``;
  };

  const generateValue = (size) => {
    let value;
    switch (size) {
      case 0:
        value = Math.floor(Math.random() * 1024) + 1;
        break;
      default:
        value = partReport({ reportSize: size });
        break;
    }
    return JSON.stringify(value);
  };

  const onChangeSize = (event) => {
    setValueSize(event.target.value);
  };

  const computeByteLength = (s) => {
    return new TextEncoder().encode(s).length;
  };

  const refresh = () => {
    window.location.reload(false);
  };

  return (
    <div className="App">
      <div className="radios" onChange={onChangeSize}>
        <label>Size class: </label>
        <input type="radio" value="0" name="sizeX" defaultChecked /> 0
        <input type="radio" value="1" name="sizeX" /> 1
        <input type="radio" value="5" name="sizeX" /> 5
        <input type="radio" value="10" name="sizeX" /> 10
      </div>
      <div
        className="remote"
        onClick={() => {
          if (durations.size === 0) {
            roll();
          } else {
            refresh();
          }
        }}
      >
        [{button}]
      </div>
      <div className="message">
        Latency {messageLatency()}, Payload {messageByteSize()}
        {""}
      </div>
      <div id="plotDiv"></div>
      <div id="plotDiv"></div>
      <div id="boxDiv"></div>
      <div id="histDiv"></div>
      <div id="violinDiv"></div>
      <div id="statDiv">
        {stats && (
          <table className="stats">
            <thead>
              <tr>
                <th>Stat</th>
                <th>Category</th>
                <th>Value (ms)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Min</td>
                <td>Fences</td>
                <td>{stats.min}</td>
              </tr>
              <tr>
                <td>First quartile</td>
                <td>Spread</td>
                <td>{stats.q1}</td>
              </tr>
              <tr>
                <td>
                  <b>Median</b>
                </td>
                <td>Central tendency</td>
                <td>
                  <b>{stats.med}</b>
                </td>
              </tr>
              <tr>
                <td>Mean</td>
                <td>Central tendency</td>
                <td>{stats.mean}</td>
              </tr>
              <tr>
                <td>Upper quartile</td>
                <td>Spread</td>
                <td>{stats.q3}</td>
              </tr>
              <tr>
                <td>Upper Fence</td>
                <td>Fences</td>
                <td>{stats.uf}</td>
              </tr>
              <tr>
                <td>Max</td>
                <td>Spread</td>
                <td>{stats.max}</td>
              </tr>
              <tr>
                <td>
                  <b>Whiskers</b>
                </td>
                <td>Range, non-outlier</td>
                <td>
                  <b>
                    {stats.lf} - {stats.uf}
                  </b>
                </td>
              </tr>
              <tr>
                <td>Outliers</td>
                <td>Fences</td>
                <td>
                  {0} - {stats.uo}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default App;
