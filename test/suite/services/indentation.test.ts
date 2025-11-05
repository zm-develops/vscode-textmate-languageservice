'use strict';

import * as vscode from 'vscode';

import { documentServicePromise, indentationServicePromise } from '../../util/factory';
import { BASENAMES, getSampleFileUri } from '../../util/files';
import { runSamplePass } from '../../util/bench';


suite('test/suite/services/indentation.test.ts - IndentationService class (src/services/indentation.ts)', function() {
	this.timeout(5000);

	test('IndentationService.fetch(): Promise<number[]>', async function() {
		void vscode.window.showInformationMessage('IndentationService class (src/services/indentation.ts)');
		const { samples, outputs } = await indentationServiceOutput();

		let error: TypeError | void = void 0;
		for (let index = 0; index < samples.length; index++) {
			const basename = BASENAMES[globalThis.languageId][index];
			const levels = outputs[index];

			try {
				await runSamplePass('indentation', basename, levels);
			} catch (e) {
				error = typeof error !== 'undefined' ? error : e as Error;
			}
		}
		if (error) {
			throw error;
		}
	});
});

async function indentationServiceOutput() {
	const documentService = await documentServicePromise;
	const indentationService = await indentationServicePromise;

	const samples = BASENAMES[globalThis.languageId].map(getSampleFileUri);
	const outputs: number[][] = [];

	for (const resource of samples) {
		const document = await documentService.getDocument(resource);
		const levels = await indentationService.fetch(document);

		outputs.push(levels);
	}

	return { outputs, samples };
}
