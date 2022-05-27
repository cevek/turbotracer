export type TurboJSON = {
    sources: {
        [k: string]: {
            functionName: string;
            sourceName: string;
            sourceText: string;
            startPosition: number;
            endPosition: number;
        };
    };
    inlinings: {
        [k: string]: {
            inliningPosition: {scriptOffset: number; inliningId: number};
            sourceId: number;
        };
    };
    phases: {
        name: string;
        data: {
            nodes: {
                label: string;
                opcode: string;
                sourcePosition?: {scriptOffset: number; inliningId: number};
            }[];
        };
    }[];
};
