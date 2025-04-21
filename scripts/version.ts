import rootPackage from "../package.json"

if (!rootPackage.version) {
	throw new Error("Root package.json does not have a version")
}

if (!rootPackage.license) {
	throw new Error("Root package.json does not have a license")
}

const glob = new Bun.Glob("{apps,libs}/*/jsr.json")

for await (const path of glob.scan()) {
	const jsrConfig = await Bun.file(path).text()
	const modifiedConfig = jsrConfig
		.replaceAll("${version}", rootPackage.version)
		.replaceAll("${license}", rootPackage.license)
	await Bun.write(path, modifiedConfig)
}
