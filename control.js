export function autocomplete(data, args) {
	return [...data.servers];
}
/** @param {NS} ns */
export function GetAllServers(ns, root = "home", found = new Set()) {
	found.add(root);
	for (const server of ns.scan(root))
		if (!found.has(server)) GetAllServers(ns, server, found);
	return [...found];
}
async function RunScript(ns, scriptName, target, threads) {
	var allServers = GetAllServers(ns);
	allServers = allServers.sort(RamSort);
	function RamSort(a, b) {
		if (ns.getServerMaxRam(a) > ns.getServerMaxRam(b)) return -1;
		if (ns.getServerMaxRam(a) < ns.getServerMaxRam(b)) return 1;
		return 0;
	}

	var ramPerThread = ns.getScriptRam(scriptName);

	var usableServers = allServers.filter(
		(p) => ns.hasRootAccess(p) && ns.getServerMaxRam(p) > 0
	);

	var firedThreads = 0;

	for (const server of usableServers) {
		var availableRam = ns.getServerMaxRam(server) - ns.getServerUsedRam(server);
		var possibleThreads = Math.floor(availableRam / ramPerThread);

		if (possibleThreads <= 0) continue;
		if (possibleThreads > threads) possibleThreads = threads;

		if (server != "home") await ns.scp(scriptName, server);

		await ns.print(
			`Starting script ${scriptName} on ${server} with ${possibleThreads} threads`
		)

		await ns.exec(scriptName, server, possibleThreads, target);

		firedThreads += possibleThreads;

		if (firedThreads >= threads) break;
	}
}
/** @param {NS} ns */
export async function main(ns) {
	var target = ns.args[0];

	if (!target) {
		target = "iron-gym";
		//ns.tprint(`Usage: ${ns.getScriptName()} [targetServer]`);
		//return;
	}
	if (target === "home") return;
	
	const hackScript = "zHack.js";
	const growScript = "zGrow.js";
	const weakenScript = "zWeaken.js"
	//ns.tprint(`target: ${target}, hackScript: ${hackScript}, growScript: ${growScript}, weakenScript: ${weakenScript}`)

	const hackRam = ns.getScriptRam(hackScript);
	const growRam = ns.getScriptRam(growScript);
	const weakenRam = ns.getScriptRam(weakenScript);
	//ns.tprint(`hackRam: ${hackRam}, growRam: ${growRam}, weakenRam: ${weakenRam}`)

	const moneyThresh = ns.getServerMaxMoney(target) * 0.75;
	const securityThresh = ns.getServerMinSecurityLevel(target) + 5;
	//ns.tprint(`moneyThresh: ${moneyThresh}, securityThresh: ${securityThresh}`)

	while (true) {
		let money = ns.getServerMoneyAvailable(target);
		let maxMoney = ns.getServerMaxMoney(target);

		money = (money) ? money : 1;
		maxMoney = (maxMoney) ? maxMoney : 1;

		let minSec = ns.getServerMinSecurityLevel(target);
		let sec = ns.getServerSecurityLevel(target);

		let weakenThreads = Math.ceil((sec - minSec) / ns.weakenAnalyze(1));
		let hackThreads = Math.ceil(ns.hackAnalyzeThreads(target, money));
		let growThreads = Math.ceil(ns.growthAnalyze(target, Math.ceil(maxMoney / money)));

		const hackTime = ns.getHackTime(target);
		const growTime = ns.getGrowTime(target);
		const weakenTime = ns.getWeakenTime(target);

		const homeMaxRam = ns.getServerMaxRam("home");
		let homeUsedRam = ns.getServerUsedRam("home");
		let availableRam = homeMaxRam - homeUsedRam;

		let maxThreads = Math.floor(
			availableRam / Math.max(hackRam, growRam, weakenRam)
		);

		if (!ns.hasRootAccess(target)) return;

		let serverSecLevel = ns.getServerSecurityLevel(target);
		if (serverSecLevel > securityThresh) {
			//ns.tprint(`getServerSecLevel: ${serverSecLevel}, securityThresh: ${securityThresh}`)
			weakenThreads = Math.min(maxThreads, weakenThreads);
			await RunScript(ns, weakenScript, target, weakenThreads);
			await ns.sleep(weakenTime);
		} else if (ns.getServerMoneyAvailable(target) < moneyThresh) {
			growThreads = Math.min(maxThreads, growThreads);
			await RunScript(ns, growScript, target, growThreads);
			await ns.sleep(growTime);
		} else {
			hackThreads = Math.min(maxThreads, hackThreads);
			await RunScript(ns, hackScript, target, hackThreads);
			await ns.sleep(hackTime);
		}
	}
}