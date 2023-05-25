export function trace({ keys, values }) {
  return {
    x: keys,
    y: values,
    type: "scatter",
    text: values.map(String),
    mode: "markers",
    name: `Latency (ms)`,
    marker: { size: 12 },
  };
}

export function layout(t) {
  return {
    title: t,
    xaxis: {
      title: {
        text: "Runs",
      },
    },
    yaxis: {
      title: {
        text: "Latency (ms)",
      },
    },
  };
}

export function boxPlot({ values }) {
  return {
    y: values,
    type: "box",
    name: "Latency (ms)",
  };
}

export function histogram({ values }) {
  return {
    x: values,
    type: "histogram",
    name: "Latency (ms)",
  };
}

export function violinPlot({ values }) {
  return {
    y: values,
    type: "violin",
    name: "Latency (ms)",
  };
}
