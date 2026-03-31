import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { createBooking } from './tools/createBooking.js';
import { queryStores } from './tools/queryStores.js';
import { queryServices } from './tools/queryServices.js';

/**
 * 创建并配置 MCP Server
 */
export function createMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: 'lann-mcp-server',
      version: '1.0.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // 注册创建预约工具
  server.registerTool(
    'create_booking',
    {
      title: '创建预约',
      description: '创建蘭泰式按摩预约。需要提供手机号、门店名称、服务项目、人数和预约时间。',
      inputSchema: z.object({
        phone: z.string().describe('手机号码（11 位中国大陆手机号）'),
        storeName: z.string().describe('门店名称，如"淮海店"、"花木店"、"新天地复兴 soho 店"等'),
        serviceName: z.string().describe('服务项目名称，如"传统古法全身按摩 -90 分钟"、"泰式精油全身护理 -90 分钟"等'),
        peopleCount: z.number().describe('预约人数（1-20 人）'),
        bookingTime: z.string().describe('预约时间，ISO 8601 格式（如：2024-01-15T14:00:00）')
      })
    },
    async ({ phone, storeName, serviceName, peopleCount, bookingTime }): Promise<CallToolResult> => {
      try {
        const result = await createBooking({
          phone,
          storeName,
          serviceName,
          peopleCount,
          bookingTime
        });

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              success: false,
              message: error instanceof Error ? error.message : '执行失败'
            }, null, 2) 
          }],
          isError: true
        };
      }
    }
  );

  // 注册查询门店工具
  server.registerTool(
    'query_stores',
    {
      title: '查询门店',
      description: '查询蘭泰式按摩门店信息，支持按城市和关键词搜索。可获取门店地址、电话和交通指引。',
      inputSchema: z.object({
        city: z.optional(z.string().describe('城市名称，如"上海"、"杭州"、"成都"等')),
        keyword: z.optional(z.string().describe('关键词，如"淮海"、"新天地"、"地铁"等'))
      })
    },
    async ({ city, keyword }): Promise<CallToolResult> => {
      try {
        const result = await queryStores({ city, keyword });

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              success: false,
              message: error instanceof Error ? error.message : '执行失败'
            }, null, 2) 
          }],
          isError: true
        };
      }
    }
  );

  // 注册查询服务工具
  server.registerTool(
    'query_services',
    {
      title: '查询服务',
      description: '查询蘭泰式按摩服务项目，支持按关键词和时长筛选。可获取服务名称、描述和时长信息。',
      inputSchema: z.object({
        keyword: z.optional(z.string().describe('关键词，如"精油"、"古法"、"拉伸"、"面部"等')),
        duration: z.optional(z.number().describe('服务时长（分钟），如 60、90、120 等'))
      })
    },
    async ({ keyword, duration }): Promise<CallToolResult> => {
      try {
        const result = await queryServices({ keyword, duration });

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        return {
          content: [{ 
            type: 'text', 
            text: JSON.stringify({
              success: false,
              message: error instanceof Error ? error.message : '执行失败'
            }, null, 2) 
          }],
          isError: true
        };
      }
    }
  );

  return server;
}
