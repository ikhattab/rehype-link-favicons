import type {HastPluginDefinition} from 'satteri'
import type {Options, Provider} from './index.js'

export type {FileInfo, Options, Provider} from './index.js'

export const providers: Record<'google' | 'duckduckgo', Provider>

export default function satteriLinkFavicons(options?: Options | null): HastPluginDefinition
