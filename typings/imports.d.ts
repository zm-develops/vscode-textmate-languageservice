// wiring from webpack `encoded-uint8array-loader` to inline WASM buffer view
declare module '*.wasm' {
	const bufview: ArrayBuffer;
	export = bufview;
}
