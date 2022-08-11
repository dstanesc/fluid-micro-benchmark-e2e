export function trace({ keys, values }) {
    return {
        x: keys,
        y: values,
        type: 'scatter',
        text: values.map(String),
        mode: 'markers',
        name: `Latency (ms)`,
        marker: { size: 12 }
    };
}

export function layout() {
    return {
        xaxis: {
            title: {
                text: 'Runs'
            }
        },
        yaxis: {
            title: {
                text: 'Latency (ms)'
            }
        }
    };
}