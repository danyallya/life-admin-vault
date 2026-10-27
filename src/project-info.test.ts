import {describe,expect,it} from 'vitest';
import {projectInfo} from './project-info';
describe("Life Admin Vault project contract",()=>{it('keeps locale and direction aligned',()=>{expect(projectInfo.slug).toBe("life-admin-vault");expect(projectInfo.direction).toBe(projectInfo.locale==='fa-IR'?'rtl':'ltr');expect(projectInfo.firstTask.length).toBeGreaterThan(8);});});
