'use strict';

import type * as vscode from 'vscode';
import { ServiceBase } from '../util/service';

import type { TokenizerService, TextmateToken } from './tokenizer';
import type { ConfigData } from '../config';

export class ConfigSymbolService extends ServiceBase<TextmateToken[]> {
	constructor(
		private _config: ConfigData,
		private _tokenizer: TokenizerService
	) {
		super();
	}

	public async parse(document: vscode.TextDocument): Promise<TextmateToken[]> {
		const tokens = await this._tokenizer.fetch(document);
		const output: TextmateToken[] = [];

		for (let index = 0; index < tokens.length - 1; index++) {
			const token = { ...tokens[index] };
			let nextToken = { ...tokens[index + 1] };

			while (nextToken && nextToken.line === token.line) {
				const isAssignment = (
					(
						this._config.selectors.assignment.single.match(token.scopes)
						&& this._config.selectors.assignment.single.match(nextToken.scopes)
					)
					|| (
						this._config.selectors.assignment.multiple.match(token.scopes)
						&& this._config.selectors.assignment.multiple.match(nextToken.scopes)
						&& !this._config.selectors.assignment.separator.match(nextToken.scopes)
					)
				);

				if (!isAssignment) {
					break;
				}

				token.endIndex = nextToken.endIndex;
				token.text += nextToken.text;

				nextToken = { ...tokens[++index + 1] };
			}

			output.push(token);
		}

		return output;
	}
}
