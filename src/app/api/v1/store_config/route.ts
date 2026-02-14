import { ApiHandler } from '@/lib/api-handler';

const api = new ApiHandler('store_config', [
  'store_whatsapp_jid', 'store_name', 'store_admin',
  'store_tagline', 'store_feature', 'store_knowledge_base',
], 'store_id');

const handlers = api.buildHandlers('jid', 'store_whatsapp_jid');

export const OPTIONS = handlers.OPTIONS;
export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
