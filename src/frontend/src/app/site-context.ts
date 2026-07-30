import { createContext, useContext } from 'react';
import { siteDefinitions, type SiteDefinition } from './site-config';

/** 当前站点定义；每个站点入口只注入自己的定义，页面据此渲染角色化文案。 */
export const SiteContext = createContext<SiteDefinition>(siteDefinitions.customer);
export const useSite = () => useContext(SiteContext);
