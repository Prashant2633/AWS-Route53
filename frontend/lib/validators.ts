export const ZONE_NAME_REGEX = /^(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.[A-Za-z0-9-]{1,63})*\.[A-Za-z]{2,}\.?$/;
export const IPV4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;
export const IPV6_REGEX = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::([0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,7}:$|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$/;
export const HOSTNAME_REGEX = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\.?$/;

export function validateZoneName(name: string): string | null {
  if (!name.trim()) return "Domain name is required";
  if (!ZONE_NAME_REGEX.test(name.trim())) {
    return "Invalid domain format (e.g. example.com). Do not start/end with dashes.";
  }
  return null;
}

export function validateRecordValue(type: string, value: string): string | null {
  const val = value.trim();
  if (!val) return "Value is required";

  switch (type) {
    case "A":
      if (!IPV4_REGEX.test(val)) {
        return "Must be a valid IPv4 address (e.g., 192.0.2.1)";
      }
      const octets = val.split(".");
      for (const oct of octets) {
        const num = parseInt(oct, 10);
        if (num < 0 || num > 255 || isNaN(num)) {
          return "IPv4 octets must be between 0 and 255";
        }
      }
      break;
      
    case "AAAA":
      if (!val.includes(":") || val.length < 3) {
        return "Must be a valid IPv6 address (e.g., 2001:db8::1)";
      }
      break;
      
    case "CNAME":
      if (!HOSTNAME_REGEX.test(val)) {
        return "CNAME value must be a valid domain name (e.g., web.example.com)";
      }
      break;
      
    case "MX": {
      const parts = val.split(/\s+/);
      if (parts.length !== 2) {
        return "Must be in format '<priority> <hostname>' (e.g., '10 mail.example.com')";
      }
      const [priority, host] = parts;
      const prioNum = parseInt(priority, 10);
      if (isNaN(prioNum) || prioNum < 0 || prioNum > 65535) {
        return "MX priority must be a number between 0 and 65535";
      }
      if (!HOSTNAME_REGEX.test(host)) {
        return "MX value must end with a valid hostname (e.g., mail.example.com)";
      }
      break;
    }
    
    case "TXT":
      if (val.length > 4096) {
        return "TXT record value must be under 4096 characters";
      }
      break;
      
    default:
      break;
  }
  return null;
}

export function validateTTL(ttl: number): string | null {
  if (isNaN(ttl) || ttl < 1 || ttl > 2147483647) {
    return "TTL must be an integer between 1 and 2,147,483,647";
  }
  return null;
}
