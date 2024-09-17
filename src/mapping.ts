import { Reference, ValueType, isReference } from "./middleware";
import { hashCode } from "./utils";
import * as Ini from "ini";

function mapToObject(map: Map<any, MappingTableValue>) {
    const obj: Record<string, any> = {};
    map.forEach((value) => {
        obj[value.name] = value.value;
    });
    return obj;
}

function deepEqualMaps<K, V>(map1: Map<K, V>, map2: Map<K, V>): boolean {
    if (map1.size !== map2.size) {
        return false;
    }
    for (const [key, value] of map1) {
        if (!map2.has(key) || map2.get(key) !== value) {
            return false;
        }
    }
    return true;
}

export type MappingTableCategory = "padding" | "shape" | "color" | "text";
export type MappingTableKey = number;
export type MappingTableValue = {
    id: MappingTableKey;
    name: string;
    value: string;
    table: MappingTableCategory;
};

const MappingMarker = "\u000F";

export function wrapReferenceMapping(value: MappingTableValue): string {
    return `${MappingMarker}${JSON.stringify(value)}${MappingMarker}`;
}

export function unwrapReferenceMapping(value: string): MappingTableValue {
    const l = MappingMarker.length;
    return JSON.parse(value.substring(l, value.length - l));
}

export function replaceAllReferenceMappings(value: string, transform: (v: MappingTableValue) => string): string {
    return value.replace(new RegExp(`${MappingMarker}(.*?)${MappingMarker}`, "g"), (m) =>
        transform(unwrapReferenceMapping(m)),
    );
}

type ParsedConfig = {
    [table in MappingTableCategory]: { [key: string]: string };
};

export abstract class MutableMappingTable {
    padding = new Map<MappingTableKey, MappingTableValue>();
    shape = new Map<MappingTableKey, MappingTableValue>();
    color = new Map<MappingTableKey, MappingTableValue>();
    text = new Map<MappingTableKey, MappingTableValue>();

    abstract transform<T = ValueType>(value: NonNullable<T> | Reference<T>): string;

    private nameValue<T = ValueType>(value: NonNullable<T> | Reference<T>): [string, string] {
        const transformedValue = this.transform(value);
        return [isReference(value) ? value.name : transformedValue, transformedValue];
    }

    private createReferenceMapping<T = ValueType>(
        table: "padding" | "shape" | "color" | "text",
        value: NonNullable<T> | Reference<T>,
    ): MappingTableValue {
        const [name, transformedValue] = this.nameValue(value);
        const id = MappingTable.createId(name);
        return { id: id, name: name, value: transformedValue, table: table };
    }

    addReference<T = ValueType>(
        table: "padding" | "shape" | "color" | "text",
        value: T | Reference<T>,
    ): MappingTableValue | undefined {
        if (!value) return undefined;
        const ref = this.createReferenceMapping(table, value);
        const mappingValue = this[table].get(ref.id) ?? ref;
        this[table].set(ref.id, mappingValue);
        return mappingValue;
    }

    getFrozen(): MappingTable {
        return MappingTable.fromMap(this);
    }

    merge(frozen: MappingTable, overwrite: boolean) {
        for (const entry of frozen) {
            if (typeof entry !== "string") {
                if (!this[entry.table].has(entry.id) || overwrite) {
                    this[entry.table].set(entry.id, entry);
                }
            }
        }
    }
}

export class MappingTable implements Iterable<MappingTableValue | MappingTableCategory> {
    // reference constructor
    private constructor(
        private tables: {
            padding: Map<MappingTableKey, MappingTableValue>;
            shape: Map<MappingTableKey, MappingTableValue>;
            color: Map<MappingTableKey, MappingTableValue>;
            text: Map<MappingTableKey, MappingTableValue>;
        },
    ) {}

    static empty() {
        return new MappingTable({
            padding: new Map<MappingTableKey, MappingTableValue>(),
            shape: new Map<MappingTableKey, MappingTableValue>(),
            color: new Map<MappingTableKey, MappingTableValue>(),
            text: new Map<MappingTableKey, MappingTableValue>(),
        });
    }

    static fromMap(tables: {
        padding: Map<MappingTableKey, MappingTableValue>;
        shape: Map<MappingTableKey, MappingTableValue>;
        color: Map<MappingTableKey, MappingTableValue>;
        text: Map<MappingTableKey, MappingTableValue>;
    }): MappingTable {
        const dest: { [table in MappingTableCategory]: Map<MappingTableKey, MappingTableValue> } = {
            padding: new Map<MappingTableKey, MappingTableValue>(),
            shape: new Map<MappingTableKey, MappingTableValue>(),
            color: new Map<MappingTableKey, MappingTableValue>(),
            text: new Map<MappingTableKey, MappingTableValue>(),
        };
        for (const table of Object.keys(dest) as MappingTableCategory[]) {
            Array.from(tables[table]).forEach(([key, value]) => dest[table].set(key, value));
        }
        return new MappingTable(dest);
    }

    static createId(name: string): number {
        return hashCode(name);
    }

    getConfig(): string {
        return Ini.stringify(
            {
                color: mapToObject(this.tables.color),
                text: mapToObject(this.tables.text),
                padding: mapToObject(this.tables.padding),
                shape: mapToObject(this.tables.shape),
            },
            { whitespace: true },
        );
    }

    static checkConfig(config: { [key: string]: any } | string): ParsedConfig {
        let parsedConfig;
        if (typeof config === "string") {
            parsedConfig = Ini.parse(config);
        } else {
            parsedConfig = config;
        }

        const allowedKeys: MappingTableCategory[] = ["padding", "shape", "color", "text"];

        for (const key of Object.keys(parsedConfig)) {
            if (!allowedKeys.includes(key as MappingTableCategory)) {
                throw new Error(`Unknown key in config: ${key}`);
            }
            for (const [k, v] of Object.entries(parsedConfig[key])) {
                if (typeof v !== "string") {
                    throw new Error(`Config key "${k}" has an unsupported value`);
                }
            }
        }

        return parsedConfig as ParsedConfig;
    }

    static fromConfig(config: string): MappingTable {
        const parsedConfig = MappingTable.checkConfig(Ini.parse(config));

        const tables = {
            padding: new Map<MappingTableKey, MappingTableValue>(),
            shape: new Map<MappingTableKey, MappingTableValue>(),
            color: new Map<MappingTableKey, MappingTableValue>(),
            text: new Map<MappingTableKey, MappingTableValue>(),
        };

        for (const [table, entries] of Object.entries(parsedConfig) as [
            MappingTableCategory,
            { [key: string]: string },
        ][]) {
            for (const [name, value] of Object.entries(entries)) {
                const id = this.createId(name);
                tables[table].set(id, { table, value, id, name });
            }
        }

        return MappingTable.fromMap(tables);
    }

    updateValue(key: MappingTableCategory, id: MappingTableKey, value: string): MappingTable {
        const mappingTable = MappingTable.fromMap(this.tables);
        if (mappingTable.tables[key].has(id)) {
            mappingTable.tables[key].set(id, { ...mappingTable.tables[key].get(id)!, value });
        }
        return mappingTable;
    }

    merge(other: MappingTable, overwrite: boolean): MappingTable {
        const mappingTable = MappingTable.fromMap(this.tables);
        for (const entry of other) {
            if (typeof entry !== "string") {
                if (!mappingTable.tables[entry.table].has(entry.id) || overwrite) {
                    mappingTable.tables[entry.table].set(entry.id, entry);
                }
            }
        }
        return mappingTable;
    }

    isEmpty() {
        const tables: MappingTableCategory[] = ["padding", "shape", "color", "text"];
        return tables.every((table) => this.tables[table].size === 0);
    }

    contentEquals(other: MappingTable): boolean {
        const tables: MappingTableCategory[] = ["padding", "shape", "color", "text"];
        return tables.every((table) => deepEqualMaps(this.tables[table], other.tables[table]));
    }

    *[Symbol.iterator](): IterableIterator<MappingTableValue | MappingTableCategory> {
        const tables: MappingTableCategory[] = ["padding", "shape", "color", "text"];

        for (const table of tables) {
            yield table;
            for (const entry of this.tables[table].values()) {
                yield entry;
            }
        }
    }
}
