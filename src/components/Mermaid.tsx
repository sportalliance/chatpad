import React, {memo, useCallback, useEffect, useRef} from "react"
import mermaid from "mermaid"
import {MermaidConfig} from "mermaid/dist/config.type";
import {Alert, Code} from "@mantine/core";
import {nanoid} from "nanoid";
import {useTheme} from "@emotion/react";

const DEFAULT_CONFIG: MermaidConfig = {
    startOnLoad: false,
    theme: "dark",
    logLevel: "fatal",
    securityLevel: "strict",
    fontFamily: '"trebuchet MS", verdana, arial, sans-serif',
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
    chart: string;
    id: string;
    config?: MermaidConfig;
}

const Mermaid = memo(function Mermaid({chart, config, id}: MermaidProps) {

        const [error, setError] = React.useState<string | undefined>(undefined);
        const [diagramSvg, setDiagramSvg] = React.useState<string | undefined>(undefined);

        const theme = useTheme();
        const configTheme = {
            // @ts-ignore
            theme: theme.colorScheme == "dark" ? "dark" : "default"
        };
        // Mermaid initilize its config
        mermaid.initialize({...DEFAULT_CONFIG, ...(config || {}), ...configTheme});

        const diagramRef = useRef<HTMLDivElement>(null);


        const updateChart = useCallback(async function () {
            if (diagramRef.current == null) return;
            try {
                const result = await mermaid.render(`${id}-svg`, chart, diagramRef.current);
                setDiagramSvg(result.svg);
                setError(undefined);
            } catch (e) {
                // @ts-ignore
                setError(e?.message ?? "Can't parse the mermaid chart");
            }
        }, [chart]);

        useEffect(() => {
            updateChart();
        }, [chart])


        const renderDiagram = function () {
            if (error) {
                return (
                    <>
                        <Alert color="red" title="Invalid">
                            <p>Couldn't parse the mermaid chart:</p>
                            <pre>{error}</pre>
                        </Alert>
                        <Code block>{chart}</Code>
                        <div ref={diagramRef}></div>
                    </>
                )
            }
            return <Code block>
                <div ref={diagramRef} className="mermaid" dangerouslySetInnerHTML={            // @ts-ignore
                    {__html: diagramSvg}}/>
            </Code>

        }

        if (!chart) return null
        return renderDiagram();


    }
    , (prevProps, nextProps) => {
        return prevProps.chart === nextProps.chart
    })

export default Mermaid