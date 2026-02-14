import { ApiHandler } from '@/lib/api-handler';

const api = new ApiHandler('paket', [
  'pkt_name', 'pkt_description', 'pkt_price', 'pkt_discount',
  'pkt_length', 'pkt_pict_num', 'pkt_kb_length', 'pkt_prompt',
  'pkt_token_length', 'pkt_temp', 'pkt_active',
], 'pkt_id');

const handlers = api.buildHandlers('id', 'pkt_id');

export const OPTIONS = handlers.OPTIONS;
export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
