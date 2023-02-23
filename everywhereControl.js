import { GetAllServers } from "control.js";
/** @param {NS} ns */
export async function main(ns) {
    const controlScript = "control.js"
    const controlScriptRam = ns.getScriptRam(controlScript)

    let allServers = GetAllServers(ns, "home");
    let controlServers = allServers.filter(e => e.startsWith('mserv-') || e === "home")
    let targetServers = allServers.filter(e => !e.startsWith('mserv-') && e != "home")

    allServers = allServers.sort(RamSort);
    function RamSort(a, b) {
        if (ns.getServerMaxRam(a) > ns.getServerMaxRam(b)) return -1;
        if (ns.getServerMaxRam(a) < ns.getServerMaxRam(b)) return 1;
        return 0;
    }

    for (let targetServer of targetServers) {
        for (let controlServer of controlServers) {
            let serverFreeRam = (
                ns.getServerMaxRam(controlServer) - ns.getServerUsedRam(controlServer)
            );

            if (serverFreeRam < controlScriptRam) continue;

            await ns.exec(controlScript, controlServer, 1, targetServer);
        }
    }
}
