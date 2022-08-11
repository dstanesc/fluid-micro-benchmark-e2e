import React, { useEffect, useState } from 'react';
import './App.css';
import { initMap } from '@dstanesc/shared-property-map';
import _ from 'lodash';

import { layout, trace } from './plot';

function App() {

  const [button, setButton] = useState("Start e2e");

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
    init().then(localId => {
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
    const traces = []
    const keys = Array.from(durations.keys());
    const values = Array.from(durations.values());
    const t = trace({ keys, values });
    traces.push(t);
    Plotly.newPlot('plotDiv', traces, layout());
  }, [durations]);

  useEffect(() => {
    const times = new Map();
    endTimes.forEach((endTime, key) => {
      const startTime = startTimes.get(key);
      const duration = endTime - startTime;
      console.log(`Setting latency for key ${key}, value=${duration}`);
      times.set(key, duration);
    });
    setDurations(times);
  }, [endTimes]);


  const updateLocalModel = (key, value) => {
    console.log(`Updating local model ${key} -> big value`);
    //setLocalValue(key);
  };

  const deleteLocalModel = (key) => {
    console.log(`Deleting local model ${key}`);
  };

  const updateRemoteModel = (key, value) => {
    const d = new Date();
    const localTime = d.getTime();
    console.log(`Updating remote endTime=${localTime} remote model ${key} -> ${value}`);
    setEndTimes(new Map(endTimes.set(key, localTime)));
    if (key.endsWith(`99`))
      setButton(`Start e2e`);
    else
      setButton(`Running`);
  };

  const deleteRemoteModel = (key) => {
    console.log(`Deleting remote model ${key}`);
    setButton(`Running`)
  };

  const roll = async () => {
    if (sharedPropertyMap) {
      await cleanUp();
      const loops = _.range(100);
      for (const loop of loops) {
        await execFn(rollDice, `${loop}`);
      }
    } else {
      alert("Please wait to initialize")
    }
  }

  const cleanUp = async () => {
    for (const key of startTimes.keys()) {
      await execFn(() => {
        if (sharedPropertyMap.has(key)) {
          sharedPropertyMap.delete(key);
          sharedPropertyMap.commit();
        }
      });
    }
  }

  const execFn = (fn, arg1) => {
    fn(arg1);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve();
      }, 100);
    });
  }

  const rollDice = (key) => {
    const newValue = Math.floor(Math.random() * 1024) + 1;
    const d = new Date();
    const localTime = d.getTime();
    const newStartTimes = startTimes.set(key, localTime);
    setStartTimes(new Map(newStartTimes));
    console.log(`Updating remote model ${newValue}`);
    sharedPropertyMap.set(key, newValue.toString());
    sharedPropertyMap.commit();
  };

  const message = () => {
    const values = Array.from(durations.values()).map(Number);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return Number.isFinite(min) ? `min: ${min} ms, max: ${max} ms` : ``
  }

  return (
    <div className="App">
      <div className="remote" onClick={() => roll()}>
        [{button}]
      </div>
      <div className="message">
        Latency {message()}
      </div>
      <div id='plotDiv'></div>
    </div>
  );
}

export default App;
