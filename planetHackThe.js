/** @param {NS} ns **/
function crawl(ns, node, nodeMap) {
	node.neighbors.forEach(nodeName => {
		if (nodeMap.has(nodeName)) { return; }
		if (nodeName.startsWith("mserv")) { return; }
		var newNode = new Object();

		newNode.name = nodeName;
		newNode.parent = node;
		newNode.neighbors = ns.scan(newNode.name);

		nodeMap.set(newNode.name, newNode);

		crawl(ns, newNode, nodeMap);
	});
}

/** @param {NS} ns **/
function printMap(ns, node, nodeMap, indent) {
	ns.tprintf(indent + "%s%s", node.name, ns.hasRootAccess(node.name) ? "(Y)" : "(N)");
	nodeMap.delete(node.name);
	indent = adjustIndent(indent, node, nodeMap);
	printIndent(ns, indent, node);

	node.neighbors.forEach(adjacentName => {
		if (nodeMap.has(adjacentName)) {
			printMap(ns, nodeMap.get(adjacentName), nodeMap, indent);
		}
	});
}

/** @param {NS} ns **/
function printIndent(ns, indent, node) {
	if (node.neighbors.length > 1) {
		ns.tprintf(indent + "|");
	}
}

function adjustIndent(indent, node, nodeMap) {
	const INDENT_SPACE = 6;
	for (var i = 0; i < INDENT_SPACE; i++) {
		if (i === 0 && hasMoreSiblings(node, nodeMap)) {
			indent += "|";
		} else {
			indent += " ";
		}
	}
	return indent;
}

function hasMoreSiblings(node, nodeMap) {
	var hasSiblings = false;
	if (node.parent === null) {
		return hasSiblings;
	}
	node.parent.neighbors.forEach(adjacent => {
		if (nodeMap.has(adjacent)) {
			hasSiblings = true;
		}
	});
	return hasSiblings;
}

/** @param {NS} ns **/
export async function hack_prep(ns, node, nodeMap) {
	nodeMap.delete(node.name);

	//var backdoorAccessFile = "nodesToRunScriptsOn.txt";
	//ns.rm(backdoorAccessFile);

	node.neighbors.forEach(async adjacentName => {
		if (nodeMap.has(adjacentName)) {
			var aName = nodeMap.get(adjacentName).name;
			//var aName = node.name;
			/*
			var programs = ns.read("hackProgramList.txt");
			for (var program of programs.split("\n")) {
				ns.tprint("program: " + program + ", src: " + src + ", dest: " + dest);
			}
			*/
			// hack server as needed
			var numPortsWeCanPwn = 0;
			ns.tprint(aName + "- HasRoot: " + ns.hasRootAccess(aName));
			let portMessages = aName + " do h4x: "
			if (!ns.hasRootAccess(aName)) {
				if (ns.getServerNumPortsRequired(aName) > 0) {
					if (ns.fileExists("BruteSSH.exe")) {
						numPortsWeCanPwn++;
						ns.brutessh(aName);
						portMessages += "brute";
					}
				}
				if (ns.getServerNumPortsRequired(aName) > 1) {
					if (ns.fileExists("FTPCrack.exe")) {
						numPortsWeCanPwn++;
						ns.ftpcrack(aName);
						portMessages += ", ftpcrack";
						ns.tprint("ftpcrack,");
					}
				}
				if (ns.getServerNumPortsRequired(aName) > 2) {
					if (ns.fileExists("relaySMTP.exe")) {
						numPortsWeCanPwn++;
						ns.relaysmtp(aName);
						portMessages += ", relaysmtp";
					}
				}
				if (ns.getServerNumPortsRequired(aName) > 3) {
					if (ns.fileExists("HTTPWorm.exe")) {
						numPortsWeCanPwn++;
						ns.httpworm(aName);
						portMessages += ", httpworm";
					}
				}
				if (ns.getServerNumPortsRequired(aName) > 4) {
					if (ns.fileExists("SQLInject.exe")) {
						numPortsWeCanPwn++;
						ns.sqlinject(aName)
						portMessages += ", Little Bobby DropTables FTW";
					}
				}
				ns.tprint(portMessages);
				// get root
				ns.tprint(aName + "- prtsreq: " + ns.getServerNumPortsRequired(aName) + " numprtspwnable: " + numPortsWeCanPwn)
				if (ns.getServerNumPortsRequired(aName) <= numPortsWeCanPwn) {
					ns.nuke(aName);
				} else {
					ns.tprint("We can't pwn " + aName + " #sadPanda")
				}
			}

			// backdoor
			/*
			if (!ns.getServer(aName).backdoorInstalled) {
				ns.tprint("Install backdoor on " + aName);
				ns.installBackdoor();
				installBackdoor();
			}
			// If that worked, write hostname into backdoorServers.txt
			if (ns.getServer(aName).backdoorInstalled) {
				ns.write(backdoorAccessFile, aName, "a")
			}
			*/

			// execute hackMeDaddy.js
			if (aName === "home") return;
			var script = "control.js";
			//if (ns.fileExists(script, aName)) ns.rm(script, aName);
			//await ns.scp(script, aName, "home");
			//ns.tprint("Distributed ", script, " to ", aName);
			ns.exec(script, "home", 1, aName);
			ns.tprint("Executed ", script, " on home targeting ", aName);
			await hack_prep(ns, nodeMap.get(adjacentName), nodeMap);
			return;
		}
	})
}
export async function planet_hack_the(ns, nodeMap) {

}
/** @param {NS} ns */
export async function main(ns) {
	var home = new Object()
	var nodeMap = new Map();

	home.name = ns.args[0] ? ns.args[0] : "home";
	home.parent = null;
	home.neighbors = ns.scan(home.name);

	home.neighbors = home.neighbors.filter(e => !e.startsWith('mserv-'));

	nodeMap.set(home.name, home);

	crawl(ns, home, nodeMap);

	await hack_prep(ns, home, nodeMap);

	//ns.tprint(Object.fromEntries([...nodeMap]));
	//printMap(ns, home, nodeMap, "");
}