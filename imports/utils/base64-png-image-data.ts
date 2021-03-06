import { Base64 } from 'meteor/base64';

export function base64PngImageData(path: string) {
	const binaryImage = Assets.getBinary(path);

	return `data:image/png;base64,${Base64.encode(binaryImage)}`;
}

export default base64PngImageData;
