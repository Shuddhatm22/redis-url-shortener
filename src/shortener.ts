import { randomBytes } from "crypto";
import Redis from "ioredis";

const redis = new Redis({
    host: "127.0.0.1",
    port: 6379,
})

redis.on("connect", () => {
    console.log("Connected to Redis");
});

redis.on("error", (err: Error) => {
    console.error("Redis error", err);
    process.exit(1);
})

function generateCode(): string {
    return randomBytes(3).toString("hex");
}

async function findExistingCode(longUrl: string) : Promise<string | null>{
    const existing = await redis.hget("url-map", longUrl);
    return existing;
}

async function registerUrl(longUrl: string, code: string) : Promise<void>{
    await redis.hset("url-map", longUrl, code);
}

async function addToHistory(longUrl: string, code: string) : Promise<void>{
    const entry = JSON.stringify({
        url: longUrl,
        code,
        createdAt: new Date().toISOString()
    });

    await redis.lpush("url-history", entry);
    await redis.ltrim("url-history", 0, 9);
}

async function getHistory() : Promise<void>{
    const entries = await redis.lrange("url-history", 0, -1);

    if(entries.length === 0){
        console.log("No history found.");
        return;
    }

    console.log("Recent URLs:");
    entries.forEach((entry, index) => {
        const parsed = JSON.parse(entry) as { url: string, code: string, createdAt: string };
        console.log(`${index + 1}. [${parsed.code}] ${parsed.url} — ${parsed.createdAt}`);
    });
}

async function updateLeaderboard(code: string) : Promise<void>{
    await redis.zincrby("leaderboard", 1, code);
}

async function getLeaderboard() : Promise<void>{
    const entries = await redis.zrange("leaderboard", 0, 4, "REV", "WITHSCORES");

    if (entries.length === 0) {
        console.log("No data yet. Resolve some URLs first.");
        return;
    }

    console.log("Top URLs by visits:");
    for(let i =0; i<entries.length; i+=2){
        const code = entries[i];
        const score = entries[i + 1];
        const url = await redis.get(`url:${code}`);
        console.log(`${i / 2 + 1}. [${score} visits] ${code} → ${url ?? "expired"}`);
    }
}

async function shortenUrl(longUrl: string) : Promise<void>{
    const existingCode = await findExistingCode(longUrl);

    if (existingCode) {
        console.log(`Already shortened!`);
        console.log(`Short code : ${existingCode}`);
        return;
      }
    
    const code = generateCode();
    const key = `url:${code}`;
    const clickKey = `clicks:${code}`;

    await redis.set(key, longUrl);
    await redis.expire(key, 60 * 60 * 24 * 7);
    await redis.set(clickKey, 0);

    await registerUrl(longUrl, code);
    await addToHistory(longUrl, code);

    console.log(`Short code : ${code}`);
    console.log(`Expires in : 7 days`);
}

async function resolveUrl(code: string): Promise<void>{
    const key = `url:${code}`;
    const clickKey = `clicks:${code}`;

    const longUrl = await redis.get(key);

    if(!longUrl){
        console.log("Short code not found or has expired.");
        return;
    }

    await redis.incr(clickKey);
    await updateLeaderboard(code);
    console.log(`Original URL: ${longUrl}`);
}

async function getStats(code: string): Promise<void>{
    const key = `url:${code}`;
    const clickKey = `clicks:${code}`;

    const [longUrl, clicks, ttl] = await Promise.all([
        redis.get(key),
        redis.get(clickKey),
        redis.ttl(key),
    ]);

    if(!longUrl){
        console.log("Short code not found or has expired.");
        return;
    }

    const daysLeft = Math.ceil(ttl / (60 * 60 * 24));

    console.log(`URL        : ${longUrl}`);
    console.log(`Visits     : ${clicks ?? 0}`);
    console.log(`Expires in : ${daysLeft} day(s)`);
}

async function main() : Promise<void>{
    const [, , command, argument] = process.argv;

    if(command === "shorten" && argument){
        await shortenUrl(argument);
    } else if(command === "resolve" && argument){
        await resolveUrl(argument);
    } else if(command === "stats" && argument){
        await getStats(argument);
    } else if(command === "history"){
        await getHistory();
    } else if(command === "leaderboard"){
        await getLeaderboard();
    } else{
        console.log("Usage:");
        console.log("  npm start -- shorten <url>");
        console.log("  npm start -- resolve <code>");
        console.log("  npm start -- stats <code>");
        console.log("  npm start -- history");
        console.log("  npm start -- leaderboard");
    }

    redis.quit();
}

main();