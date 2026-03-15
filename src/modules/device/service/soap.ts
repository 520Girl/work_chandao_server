
import { Provide, Config, Logger } from '@midwayjs/core';
import { ILogger } from '@midwayjs/logger';
import axios from 'axios';

@Provide()
export class DeviceSoapService {
  @Config('device.soap')
  soapConfig;

  @Logger()
  logger: ILogger;

  /**
   * 发送 SOAP 请求
   * @param method 方法名
   * @param data 请求数据
   */
  async call(method: string, data: any): Promise<any> {
    const { url, username, password } = this.soapConfig;

    const soapXML = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header>
    <MXSoapHeader xmlns="http://bed.cn/">
      <Username>${username}</Username>
      <Password>${password}</Password>
    </MXSoapHeader>
  </soap:Header>
  <soap:Body>
    <${method} xmlns="http://bed.cn/">
      <dataJson>${JSON.stringify(data)}</dataJson>
    </${method}>
  </soap:Body>
</soap:Envelope>`;

    try {
      this.logger.info(`[SOAP Request] Method: ${method}, Data: ${JSON.stringify(data)}`);

      const response = await axios.post(url, soapXML, {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': `http://bed.cn/${method}`,
        },
        timeout: 10000, // 10 秒超时
      });

      const responseData = response.data;
      
      // 由于返回格式相对固定，使用正则解析 XML 响应
      // 格式：<soap:Body>...<MethodResult>JSON_STRING</MethodResult>...</soap:Body>
      const match = responseData.match(new RegExp(`<(${method}Result|${method}Result xmlns="http://bed.cn/")>(.*?)<\/${method}Result>`, 's')) || 
                    responseData.match(new RegExp(`: ${method}Result>(.*?)<`, 's')); 

      let jsonString = '';
      
      if (match && match[2]) { // match[2] 为内容，match[1] 为标签名或前缀
         jsonString = match[2];
      } else if (match && match[1]) { // 第一种正则未命中时使用第二种匹配结果
         jsonString = match[1];
      } else {
        // 简单标签匹配兜底
        const startTag = `${method}Result`;
        const startIndex = responseData.indexOf(startTag);
        if (startIndex > -1) {
            const contentStart = responseData.indexOf('>', startIndex) + 1;
            const contentEnd = responseData.indexOf(`</`, contentStart);
            if (contentEnd > contentStart) {
                jsonString = responseData.substring(contentStart, contentEnd);
            }
        }
      }

      if (!jsonString) {
        if (responseData.includes('soap:Fault')) {
            throw new Error('SOAP Fault: ' + responseData);
        }
        // 尝试匹配 Result 标签中 > 与 < 之间的内容
        // 标准场景下通常前面的正则即可覆盖
        this.logger.error(`[SOAP Error] Failed to parse response for ${method}: ${responseData}`);
        throw new Error('Invalid SOAP response');
      }

      // 如果存在 HTML 实体，先进行解码
      jsonString = jsonString.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
      
      const result = JSON.parse(jsonString);
      
      this.logger.info(`[SOAP Response] Method: ${method}, Result: ${JSON.stringify(result)}`);
      
      return result;

    } catch (error) {
      this.logger.error(`[SOAP Error] Method: ${method}, Error: ${error.message}`);
      throw error;
    }
  }
}
