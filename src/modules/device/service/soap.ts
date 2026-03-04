
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
   * Send SOAP request
   * @param method method name
   * @param data request data
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
        timeout: 10000, // 10s timeout
      });

      const responseData = response.data;
      
      // Parse XML response using regex since format is predictable
      // Format: <soap:Body>...<MethodResult>JSON_STRING</MethodResult>...</soap:Body>
      const match = responseData.match(new RegExp(`<(${method}Result|${method}Result xmlns="http://bed.cn/")>(.*?)<\/${method}Result>`, 's')) || 
                    responseData.match(new RegExp(`: ${method}Result>(.*?)<`, 's')); 

      let jsonString = '';
      
      if (match && match[2]) { // match[2] captures the content because match[1] captures the tag name or prefix
         jsonString = match[2];
      } else if (match && match[1]) { // If the first regex failed and second one matched
         jsonString = match[1];
      } else {
        // Fallback for simple tag match
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
        // Try to match simply the content between > and < if it's the only content in Result
        // But let's assume the regex works for standard cases.
        this.logger.error(`[SOAP Error] Failed to parse response for ${method}: ${responseData}`);
        throw new Error('Invalid SOAP response');
      }

      // Decode HTML entities if any
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
