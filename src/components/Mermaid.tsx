import React, {useEffect} from "react"
import mermaid from "mermaid"
import {MermaidConfig} from "mermaid/dist/config.type";
import {useLazyEffect} from "../utils/useLazyEffect";

const DEFAULT_CONFIG: MermaidConfig = {
    startOnLoad: true,
    theme: "dark",
    logLevel: "fatal",
    securityLevel: "strict",
    arrowMarkerAbsolute: false,
    flowchart: {
        htmlLabels: true,
        curve: "linear",
    },
    sequence: {
        diagramMarginX: 50,
        diagramMarginY: 10,
        actorMargin: 50,
        width: 150,
        height: 65,
        boxMargin: 10,
        boxTextMargin: 5,
        noteMargin: 10,
        messageMargin: 35,
        mirrorActors: true,
        bottomMarginAdj: 1,
        useMaxWidth: true,
        rightAngles: false,
        showSequenceNumbers: false,
    },
    gantt: {
        titleTopMargin: 25,
        barHeight: 20,
        barGap: 4,
        topPadding: 50,
        leftPadding: 75,
        gridLineStartPadding: 35,
        fontSize: 11,
        numberSectionStyles: 4,
        axisFormat: "%Y-%m-%d",
    },
}

interface MermaidProps {
    chart: React.ReactNode;
    config?: MermaidConfig;
}

const Mermaid = ({chart, config}: MermaidProps) => {

    // Mermaid initilize its config
    mermaid.initialize({...DEFAULT_CONFIG, ...(config || {})});

    useEffect(() => {
        mermaid.contentLoaded()
    }, [config])


    if (!chart) return null
    return (
        <div className="mermaid">
            {chart}
        </div>
    )


}

export default Mermaid