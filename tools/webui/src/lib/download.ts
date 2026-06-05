export interface DownloadFile {
	name: string;
	blob: Blob;
}

export function downloadBlob(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.style.display = 'none';
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 0);
}

const encoder = new TextEncoder();

let crcTable: Uint32Array | null = null;

function getCrcTable(): Uint32Array {
	if (crcTable) return crcTable;
	const table = new Uint32Array(256);
	for (let i = 0; i < table.length; i++) {
		let c = i;
		for (let j = 0; j < 8; j++) {
			c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		}
		table[i] = c >>> 0;
	}
	crcTable = table;
	return table;
}

function crc32(data: Uint8Array): number {
	const table = getCrcTable();
	let c = 0xffffffff;
	for (const byte of data) {
		c = table[(c ^ byte) & 0xff] ^ (c >>> 8);
	}
	return (c ^ 0xffffffff) >>> 0;
}

function putU16(view: DataView, offset: number, value: number): void {
	view.setUint16(offset, value, true);
}

function putU32(view: DataView, offset: number, value: number): void {
	view.setUint32(offset, value, true);
}

function zip32(value: number, label: string): number {
	if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
		throw new Error(`${label} exceeds ZIP32 limit`);
	}
	return value;
}

function dosDateTime(date = new Date()): { time: number; date: number } {
	const year = Math.max(1980, date.getFullYear());
	return {
		time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
		date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
	};
}

function makeLocalHeader(
	name: Uint8Array,
	crc: number,
	size: number,
	time: number,
	date: number
): Uint8Array {
	const header = new Uint8Array(30 + name.length);
	const view = new DataView(header.buffer);
	putU32(view, 0, 0x04034b50);
	putU16(view, 4, 20);
	putU16(view, 6, 0x0800); // UTF-8 filenames
	putU16(view, 8, 0); // store, no compression
	putU16(view, 10, time);
	putU16(view, 12, date);
	putU32(view, 14, crc);
	putU32(view, 18, size);
	putU32(view, 22, size);
	putU16(view, 26, name.length);
	putU16(view, 28, 0);
	header.set(name, 30);
	return header;
}

function makeCentralHeader(
	name: Uint8Array,
	crc: number,
	size: number,
	offset: number,
	time: number,
	date: number
): Uint8Array {
	const header = new Uint8Array(46 + name.length);
	const view = new DataView(header.buffer);
	putU32(view, 0, 0x02014b50);
	putU16(view, 4, 20);
	putU16(view, 6, 20);
	putU16(view, 8, 0x0800); // UTF-8 filenames
	putU16(view, 10, 0); // store, no compression
	putU16(view, 12, time);
	putU16(view, 14, date);
	putU32(view, 16, crc);
	putU32(view, 20, size);
	putU32(view, 24, size);
	putU16(view, 28, name.length);
	putU16(view, 30, 0);
	putU16(view, 32, 0);
	putU16(view, 34, 0);
	putU16(view, 36, 0);
	putU32(view, 38, 0);
	putU32(view, 42, offset);
	header.set(name, 46);
	return header;
}

function makeEndRecord(entryCount: number, centralSize: number, centralOffset: number): Uint8Array {
	const record = new Uint8Array(22);
	const view = new DataView(record.buffer);
	putU32(view, 0, 0x06054b50);
	putU16(view, 4, 0);
	putU16(view, 6, 0);
	putU16(view, 8, entryCount);
	putU16(view, 10, entryCount);
	putU32(view, 12, centralSize);
	putU32(view, 16, centralOffset);
	putU16(view, 20, 0);
	return record;
}

function blobPart(bytes: Uint8Array): ArrayBuffer {
	return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export async function createStoreZip(files: DownloadFile[]): Promise<Blob> {
	if (files.length > 0xffff) throw new Error('Too many files for ZIP32');

	const localParts: Uint8Array[] = [];
	const centralParts: Uint8Array[] = [];
	let offset = 0;
	const { time, date } = dosDateTime();

	for (const file of files) {
		const name = encoder.encode(file.name);
		if (name.length > 0xffff) throw new Error(`Filename too long: ${file.name}`);

		const data = new Uint8Array(await file.blob.arrayBuffer());
		const size = zip32(data.byteLength, `${file.name} size`);
		const crc = crc32(data);
		const localOffset = zip32(offset, 'Local header offset');
		const localHeader = makeLocalHeader(name, crc, size, time, date);
		const centralHeader = makeCentralHeader(name, crc, size, localOffset, time, date);

		localParts.push(localHeader, data);
		centralParts.push(centralHeader);
		offset = zip32(offset + localHeader.byteLength + data.byteLength, 'ZIP body size');
	}

	const centralOffset = zip32(offset, 'Central directory offset');
	const centralSize = zip32(
		centralParts.reduce((sum, part) => sum + part.byteLength, 0),
		'Central directory size'
	);
	const endRecord = makeEndRecord(files.length, centralSize, centralOffset);

	const parts = [...localParts, ...centralParts, endRecord].map(blobPart);
	return new Blob(parts, { type: 'application/zip' });
}
