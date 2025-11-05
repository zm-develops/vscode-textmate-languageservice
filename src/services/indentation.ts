'use strict';

import type * as vscode from 'vscode';
import { ServiceBase } from '../util/service';

import type { TokenizerService } from './tokenizer';
import type { ConfigData } from '../config';

interface TokenIndentationState {
	continuation: boolean;
	declaration: boolean;
	delta: number;
	line: number;
	level: number;
}

export class IndentationService extends ServiceBase<number[]> {
	private _states: Record<string, TokenIndentationState> = {};

	constructor(
		private _config: ConfigData,
		private _tokenizer: TokenizerService
	) {
		super();
	}

	public async parse(document: vscode.TextDocument): Promise<number[]> {
		const tokens = await this._tokenizer.fetch(document);

		const levels: number[] = [];

		const state = {} as TokenIndentationState;
		state.delta = 0;
		state.continuation = false;
		state.declaration = false;
		state.line = 0;
		state.level = 0;

		for (let index = 0; index < (tokens.length - 1); index++) {
			const token = tokens[index];
			const lineNumber = token.line;

			const delta = this._config.selectors.indentation.value(token.scopes) || 0;
			const isIndentToken = delta > 0;
			const isDedentToken = delta < 0;
			const isRedentToken = this._config.selectors.dedentation.match(token.scopes);
			const isDeclarationToken = isIndentToken || isRedentToken;
			const isContinuationToken = this._config.selectors.punctuation.continuation.match(token.scopes);

			if (state.declaration === false) {
				if (isDedentToken) {
					state.level += delta;
					let subindex =  index - 1;
					while (subindex >= 0 && tokens[subindex].line === lineNumber) {
						levels[subindex] += delta;
						subindex -= 1;
					}
				}
				if (isDeclarationToken) {
					state.delta += Math.abs(delta);
				}
			}

			if (state.declaration && !isRedentToken) { // handle redent e.g. ELSE-IF clause
				state.delta += delta;
			}

			state.declaration = state.declaration || isDeclarationToken;
			state.continuation = state.continuation || isContinuationToken;

			if (state.declaration && lineNumber > state.line) {
				if (state.continuation === false) {
					state.level += state.delta;
					state.delta = 0;
					state.declaration = false;
				} else {
					state.continuation = false;
				}
			}

			state.line = lineNumber;
			levels.push(state.level);
		}

		return levels;
	}
}
