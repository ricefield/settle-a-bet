import { clsx, type ClassValue } from "clsx";
import { networkInterfaces } from "os";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Gets the local network IP address of the machine.
 * @returns The local IPv4 address or 'localhost' as a fallback.
 */
export function getLocalNetworkIp() {
  const nets = networkInterfaces();
  const results = Object.create(null); // Or just '{}', this is more robust

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === "IPv4" && !net.internal) {
        if (!results[name]) {
          results[name] = [];
        }
        results[name].push(net.address);
      }
    }
  }

  // Return the first IP found, or fallback to 'localhost'
  const firstInterface = Object.keys(results)[0];
  return firstInterface ? results[firstInterface][0] : "localhost";
}
