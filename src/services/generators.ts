'use strict';

import TextmateLanguageService from '../main';

export class GeneratorCollection {
	private _languages: Map<string, TextmateLanguageService> = new Map();

	constructor(
	) {
		this._languages = new Map();
	}

	public get(languageId: string): TextmateLanguageService {
		if (this._languages.has(languageId)) {
			return this._languages.get(languageId);
		}
		return this._create(languageId);
	}

	private _create(languageId: string): TextmateLanguageService {
		const service = new TextmateLanguageService(languageId);
		this._languages.set(languageId, service);
		return service;
	}
}
