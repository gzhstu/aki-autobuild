import { DependencyContainer, inject, injectable } from "tsyringe";
import { OnLoad } from "../di/OnLoad";
import { IPostDBLoadMod } from "../models/external/IPostDBLoadMod";
import { IPostDBLoadModAsync } from "../models/external/IPostDBLoadModAsync";
import { ILogger } from "../models/spt/utils/ILogger";
import { LocalisationService } from "../services/LocalisationService";
import { ModTypeCheck } from "./ModTypeCheck";
import { PreAkiModLoader } from "./PreAkiModLoader";

@injectable()
export class PostDBModLoader implements OnLoad
{
    constructor(
        @inject("WinstonLogger") protected logger: ILogger,
        @inject("PreAkiModLoader") protected preAkiModLoader: PreAkiModLoader,
        @inject("LocalisationService") protected localisationService: LocalisationService,
        @inject("ModTypeCheck") protected modTypeCheck: ModTypeCheck
    )
    { }
    
    public async onLoad(): Promise<void>
    {
        if (globalThis.G_MODS_ENABLED)
        {
            await this.executeMods(this.preAkiModLoader.getContainer());
        }
    }
    
    public getRoute(): string
    {
        return "aki-mods";
    }


    public getModPath(mod: string): string
    {
        return this.preAkiModLoader.getModPath(mod);
    }

    protected async executeMods(container: DependencyContainer): Promise<void>
    {
        const mods = this.preAkiModLoader.sortModsLoadOrder();
        const promises = new Array<Promise<void>>();
        for (const modName of mods)
        {
            // // import class
            const filepath = `${this.preAkiModLoader.getModPath(modName)}${this.preAkiModLoader.getImportedModDetails()[modName].main}`;
            const modpath = `${process.cwd()}/${filepath}`;
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const mod = require(modpath);
            if (this.modTypeCheck.isPostDBAkiLoad(mod.mod))
            {
                (mod.mod as IPostDBLoadMod).postDBLoad(container);
            }
            if (this.modTypeCheck.isPostDBAkiLoadAsync(mod.mod))
            {
                promises.push(
                    (mod.mod as IPostDBLoadModAsync).postDBLoadAsync(container)
                        .catch((err) => this.logger.error(this.localisationService.getText("modloader-async_mod_error", `${err?.message ?? ""}\n${err.stack ?? ""}`)))
                );
            }
        }
        await Promise.all(promises);
    }
}