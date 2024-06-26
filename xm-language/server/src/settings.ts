export interface XmidasSettings {
	maxNumberOfProblems: number;
	disabledLintPlugins: string;
	xmDiskPaths: string[];
}

export const defaultSettings: XmidasSettings = {
	maxNumberOfProblems: 1000,
	disabledLintPlugins: "",
	xmDiskPaths: ["/opt/xmidas/xm-5_4_x/xm", "/opt/xmidas/xm-5_4_x/xmopts/threedb"]
};
