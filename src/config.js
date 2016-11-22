import { ALIASES, DEFAULT_POT_OUTPUT, DEFAULT_HEADERS } from './defaults';
import Ajv from 'ajv';
import gettext from './extractors/gettext';
import ngettext from './extractors/ngettext';

const DEFAULT_EXTRACTORS = [gettext, ngettext];

const extractConfigSchema = {
    type: ['object', 'null'],
    properties: {
        output: { type: 'string' },
        headers: {
            properties: {
                'content-type': { type: 'string' },
                'plural-forms': { type: 'string' },
            },
            additionalProperties: false,
        },
    },
    additionalProperties: false,
};

const resolveConfigSchema = {
    type: ['object', 'null'],
    properties: {
        locale: { type: 'string' },
    },
    required: ['locale'],
    additionalProperties: false,
};

const localesSchema = {
    type: 'object',
    additionalProperties: { type: 'string' },
};

const configSchema = {
    type: 'object',
    properties: {
        extract: extractConfigSchema,
        resolve: resolveConfigSchema,
        locales: localesSchema,
    },
    additionalProperties: false,
};

class ConfigValidationError extends Error {}
class ConfigError extends Error {}

function validateConfig(config, schema) {
    const ajv = new Ajv({ allErrors: true, verbose: true, v5: true });
    const isValid = ajv.validate(schema, config);
    return [isValid, ajv.errorsText(), ajv.errors];
}

class Config {
    constructor(config = {}) {
        this.config = config;
        const [validationResult, errorsText] = validateConfig(this.config, configSchema);
        if (!validationResult) {
            throw new ConfigValidationError(errorsText);
        }
    }

    getAliasFor(funcName) {
        // TODO: implement possibility to overwrite or add aliases in config;
        const aliases = ALIASES;
        for (const k of Object.keys(aliases)) {
            if (aliases[k] === funcName) {
                return k;
            }
        }
        throw new ConfigError(`Alias for function ${funcName} was not found ${JSON.stringify(aliases)}`);
    }

    getExtractors() {
        // TODO: implement possibility to specify additional extractors in config;
        return DEFAULT_EXTRACTORS;
    }

    getNPlurals() {
        const headers = (this.config.extract && this.config.extract.headers) || DEFAULT_HEADERS;
        const nplurals = /nplurals ?= ?(\d)/.exec(headers['plural-forms'])[1];
        return parseInt(nplurals);
    }

    getPluralForm() {
        const headers = (this.config.extract && this.config.extract.headers) || DEFAULT_HEADERS;
        const pluralForm = /plural ?=?\(([\s\S]*)\);/.exec(headers['plural-forms'])[1];
        return pluralForm;
    }

    getOutputFilepath() {
        return (this.config.extract && this.config.extract.output) || DEFAULT_POT_OUTPUT;
    }

    getPoFilePath() {
        // TODO: handle locale is not found;
        const locale = this.config.resolve.locale;
        return this.config.locales[locale];
    }

    isExtractMode() {
        return Boolean(this.config.extract);
    }

    isResolveMode() {
        return Boolean(this.config.resolve);
    }
}

export default Config;
