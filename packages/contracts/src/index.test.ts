import {it,expect} from 'vitest';import {sourceSchema} from './index';
const source={id:'s',title:'官方来源',institution:'公共服务机构',url:'https://example.gov.cn/',publishedAt:null,verifiedAt:new Date().toISOString()};
it('未来核查时间不能伪装成已经核查',()=>{expect(sourceSchema.safeParse({...source,verifiedAt:new Date(Date.now()+86400000).toISOString()}).success).toBe(false);expect(sourceSchema.safeParse(source).success).toBe(true)});
it('来源链接不能使用脚本或非安全协议',()=>{expect(sourceSchema.safeParse({...source,url:'javascript:alert(1)'}).success).toBe(false);expect(sourceSchema.safeParse({...source,url:'http://example.gov.cn/'}).success).toBe(false)});
