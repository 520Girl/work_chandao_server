"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const web_1 = require("@midwayjs/web");
const bootstrap_1 = require("@midwayjs/bootstrap");
async function listMenus() {
    // Load the application
    await bootstrap_1.Bootstrap.configure({
        appDir: process.cwd(),
        baseDir: process.cwd() + '/dist', // Assuming compiled code is in dist
    }).run();
    const container = bootstrap_1.Bootstrap.getApplicationContext();
    const app = await container.getAsync(web_1.Framework);
    // Get the repository
    const menuRepo = await (await app.getApplicationContextAsync()).getAsync('baseSysMenuEntityRepository'); // This might need adjustment depending on how repo is registered
    // Actually, let's try to get the model directly if possible or use a more standard way if I knew the exact injection token.
    // In Cool-Admin/Midway, usually repositories are injected. 
    // Let's try to get the TypeORM source or just use a raw query if needed, but entity is better.
    // Let's assume standard Cool-Admin structure.
    // A safer bet for a script without full context of injection tokens:
    const typeorm = require('typeorm');
    const config = container.getConfigService().configuration;
    // This is getting complicated to load the full app just for a script without knowing the exact config.
    // Let's try a simpler approach: Connect to DB directly using the config from config/config.default.ts (or similar)
    // But I can't easily read the TS config file and parse it.
    // Alternative: Use the existing logic I used in previous turns.
    // In previous turns, I used `temp/update_menu.js` which likely established a connection.
    // Let's check `temp/update_menu.js` if it exists, or just write a new one using the same pattern.
}
// Actually, I'll just write a script that connects to mysql directly, it's often easier for these one-off tasks if I know the credentials.
// I can find credentials in src/config/config.default.ts or similar.
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2tfbWVudV9zY3JpcHRfcGxhY2Vob2xkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjaGVja19tZW51X3NjcmlwdF9wbGFjZWhvbGRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUVBLHVDQUEwQztBQUMxQyxtREFBZ0Q7QUFHaEQsS0FBSyxVQUFVLFNBQVM7SUFDdEIsdUJBQXVCO0lBQ3ZCLE1BQU0scUJBQVMsQ0FBQyxTQUFTLENBQUM7UUFDeEIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUU7UUFDckIsT0FBTyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRyxPQUFPLEVBQUUsb0NBQW9DO0tBQ3ZFLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUVULE1BQU0sU0FBUyxHQUFHLHFCQUFTLENBQUMscUJBQXFCLEVBQUUsQ0FBQztJQUNwRCxNQUFNLEdBQUcsR0FBRyxNQUFNLFNBQVMsQ0FBQyxRQUFRLENBQUMsZUFBUyxDQUFDLENBQUM7SUFFaEQscUJBQXFCO0lBQ3JCLE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxNQUFNLEdBQUcsQ0FBQywwQkFBMEIsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQyxpRUFBaUU7SUFFMUssNEhBQTRIO0lBQzVILDREQUE0RDtJQUM1RCwrRkFBK0Y7SUFDL0YsOENBQThDO0lBRTlDLHFFQUFxRTtJQUNyRSxNQUFNLE9BQU8sR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDbkMsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLGdCQUFnQixFQUFFLENBQUMsYUFBYSxDQUFDO0lBQzFELHVHQUF1RztJQUV2RyxtSEFBbUg7SUFDbkgsMkRBQTJEO0lBRTNELGdFQUFnRTtJQUNoRSx5RkFBeUY7SUFDekYsa0dBQWtHO0FBQ3BHLENBQUM7QUFFRCwySUFBMkk7QUFDM0kscUVBQXFFIn0=