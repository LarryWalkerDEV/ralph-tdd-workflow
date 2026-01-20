# \# Text To Dialogue V3 API Documentation - Get



> Generate content using the Text To Dialogue V3 model



\## Overview



This document describes how to use the Text To Dialogue V3 model for content generation. The process consists of two steps:

1\. Create a generation task

2\. Query task status and results



\## Authentication



All API requests require a Bearer Token in the request header:



```

Authorization: Bearer YOUR\_API\_KEY

```



Get API Key:

1\. Visit \[API Key Management Page](https://kie.ai/api-key) to get your API Key

2\. Add to request header: `Authorization: Bearer YOUR\_API\_KEY`



---



\## 1. Create Generation Task



\### API Information

\- \*\*URL\*\*: `POST https://api.kie.ai/api/v1/jobs/createTask`

\- \*\*Content-Type\*\*: `application/json`



\### Request Parameters



| Parameter | Type | Required | Description |

|-----------|------|----------|-------------|

| model | string | Yes | Model name, format: `elevenlabs/text-to-dialogue-v3` |

| input | object | Yes | Input parameters object |

| callBackUrl | string | No | Callback URL for task completion notifications. If provided, the system will send POST requests to this URL when the task completes (success or fail). If not provided, no callback notifications will be sent. Example: `"https://your-domain.com/api/callback"` |



\### Model Parameter



The `model` parameter specifies which AI model to use for content generation.



| Property | Value | Description |

|----------|-------|-------------|

| \*\*Format\*\* | `elevenlabs/text-to-dialogue-v3` | The exact model identifier for this API |

| \*\*Type\*\* | string | Must be passed as a string value |

| \*\*Required\*\* | Yes | This parameter is mandatory for all requests |



> \*\*Note\*\*: The model parameter must match exactly as shown above. Different models have different capabilities and parameter requirements.



\### Callback URL Parameter



The `callBackUrl` parameter allows you to receive automatic notifications when your task completes.



| Property | Value | Description |

|----------|-------|-------------|

| \*\*Purpose\*\* | Task completion notification | Receive real-time updates when your task finishes |

| \*\*Method\*\* | POST request | The system sends POST requests to your callback URL |

| \*\*Timing\*\* | When task completes | Notifications sent for both success and failure states |

| \*\*Content\*\* | Query Task API response | Callback content structure is identical to the Query Task API response |

| \*\*Parameters\*\* | Complete request data | The `param` field contains the complete Create Task request parameters, not just the input section |

| \*\*Optional\*\* | Yes | If not provided, no callback notifications will be sent |



\*\*Important Notes:\*\*

\- The callback content structure is identical to the Query Task API response

\- The `param` field contains the complete Create Task request parameters, not just the input section  

\- If `callBackUrl` is not provided, no callback notifications will be sent



\### input Object Parameters



\#### stability

\- \*\*Type\*\*: `number`

\- \*\*Required\*\*: No

\- \*\*Description\*\*: Determines how stable the voice is and the randomness between each generation.

\- \*\*Range\*\*: 0 - 1 (step: 0.5)

\- \*\*Default Value\*\*: `0.5`



\#### language\_code

\- \*\*Type\*\*: `string`

\- \*\*Required\*\*: No

\- \*\*Description\*\*: Select description

\- \*\*Options\*\*:

&nbsp; - `auto`: Auto

&nbsp; - `af`: Afrikaans

&nbsp; - `ar`: Arabic

&nbsp; - `hy`: Armenian

&nbsp; - `as`: Assamese

&nbsp; - `az`: Azerbaijani

&nbsp; - `be`: Belarusian

&nbsp; - `bn`: Bengali

&nbsp; - `bs`: Bosnian

&nbsp; - `bg`: Bulgarian

&nbsp; - `ca`: Catalan

&nbsp; - `ceb`: Cebuano

&nbsp; - `ny`: Chichewa

&nbsp; - `hr`: Croatian

&nbsp; - `cs`: Czech

&nbsp; - `da`: Danish

&nbsp; - `nl`: Dutch

&nbsp; - `en`: English

&nbsp; - `et`: Estonian

&nbsp; - `fil`: Filipino

&nbsp; - `fi`: Finnish

&nbsp; - `fr`: French

&nbsp; - `gl`: Galician

&nbsp; - `ka`: Georgian

&nbsp; - `de`: German

&nbsp; - `el`: Greek

&nbsp; - `gu`: Gujarati

&nbsp; - `ha`: Hausa

&nbsp; - `he`: Hebrew

&nbsp; - `hi`: Hindi

&nbsp; - `hu`: Hungarian

&nbsp; - `is`: Icelandic

&nbsp; - `id`: Indonesian

&nbsp; - `ga`: Irish

&nbsp; - `it`: Italian

&nbsp; - `ja`: Japanese

&nbsp; - `jv`: Javanese

&nbsp; - `kn`: Kannada

&nbsp; - `kk`: Kazakh

&nbsp; - `ky`: Kirghiz

&nbsp; - `ko`: Korean

&nbsp; - `lv`: Latvian

&nbsp; - `ln`: Lingala

&nbsp; - `lt`: Lithuanian

&nbsp; - `lb`: Luxembourgish

&nbsp; - `mk`: Macedonian

&nbsp; - `ms`: Malay

&nbsp; - `ml`: Malayalam

&nbsp; - `zh`: Mandarin Chinese

&nbsp; - `mr`: Marathi

&nbsp; - `ne`: Nepali

&nbsp; - `no`: Norwegian

&nbsp; - `ps`: Pashto

&nbsp; - `fa`: Persian

&nbsp; - `pl`: Polish

&nbsp; - `pt`: Portuguese

&nbsp; - `pa`: Punjabi

&nbsp; - `ro`: Romanian

&nbsp; - `ru`: Russian

&nbsp; - `sr`: Serbian

&nbsp; - `sd`: Sindhi

&nbsp; - `sk`: Slovak

&nbsp; - `sl`: Slovenian

&nbsp; - `so`: Somali

&nbsp; - `es`: Spanish

&nbsp; - `sw`: Swahili

&nbsp; - `sv`: Swedish

&nbsp; - `ta`: Tamil

&nbsp; - `te`: Telugu

&nbsp; - `th`: Thai

&nbsp; - `tr`: Turkish

&nbsp; - `uk`: Ukrainian

&nbsp; - `ur`: Urdu

&nbsp; - `vi`: Vietnamese

&nbsp; - `cy`: Welsh

\- \*\*Default Value\*\*: `"auto"`



\### Request Example



```json

{

&nbsp; "model": "elevenlabs/text-to-dialogue-v3",

&nbsp; "input": {

&nbsp;   "stability": 0.5,

&nbsp;   "language\_code": "auto"

&nbsp; }

}

```

\### Response Example



```json

{

&nbsp; "code": 200,

&nbsp; "msg": "success",

&nbsp; "data": {

&nbsp;   "taskId": "281e5b0\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*f39b9"

&nbsp; }

}

```



\### Response Parameters



| Parameter | Type | Description |

|-----------|------|-------------|

| code | integer | Response status code, 200 indicates success |

| msg | string | Response message |

| data.taskId | string | Task ID for querying task status |



---



\## 2. Query Task Status



\### API Information

\- \*\*URL\*\*: `GET https://api.kie.ai/api/v1/jobs/recordInfo`

\- \*\*Parameter\*\*: `taskId` (passed via URL parameter)



\### Request Example

```

GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId=281e5b0\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*f39b9

```



\### Response Example



```json

{

&nbsp; "code": 200,

&nbsp; "msg": "success",

&nbsp; "data": {

&nbsp;   "taskId": "281e5b0\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*f39b9",

&nbsp;   "model": "elevenlabs/text-to-dialogue-v3",

&nbsp;   "state": "waiting",

&nbsp;   "param": "{\\"model\\":\\"elevenlabs/text-to-dialogue-v3\\",\\"input\\":{\\"stability\\":0.5,\\"language\_code\\":\\"auto\\"}}",

&nbsp;   "resultJson": "",

&nbsp;   "failCode": null,

&nbsp;   "failMsg": null,

&nbsp;   "costTime": null,

&nbsp;   "completeTime": null,

&nbsp;   "createTime": 1757584164490

&nbsp; }

}

```



\### Response Parameters



| Parameter | Type | Description |

|-----------|------|-------------|

| code | integer | Response status code, 200 indicates success |

| msg | string | Response message |

| data.taskId | string | Task ID |

| data.model | string | Model name used |

| data.state | string | Task status: `waiting`(waiting),  `success`(success), `fail`(fail) |

| data.param | string | Task parameters (JSON string) |

| data.resultJson | string | Task result (JSON string, available when task is success). Structure depends on outputMediaType: `{resultUrls: \[]}` for image/media/video, `{resultObject: {}}` for text |

| data.failCode | string | Failure code (available when task fails) |

| data.failMsg | string | Failure message (available when task fails) |

| data.costTime | integer | Task duration in milliseconds (available when task is success) |

| data.completeTime | integer | Completion timestamp (available when task is success) |

| data.createTime | integer | Creation timestamp |



---



\## Usage Flow



1\. \*\*Create Task\*\*: Call `POST https://api.kie.ai/api/v1/jobs/createTask` to create a generation task

2\. \*\*Get Task ID\*\*: Extract `taskId` from the response

3\. \*\*Wait for Results\*\*: 

&nbsp;  - If you provided a `callBackUrl`, wait for the callback notification

&nbsp;  - If no `callBackUrl`, poll status by calling `GET https://api.kie.ai/api/v1/jobs/recordInfo`

4\. \*\*Get Results\*\*: When `state` is `success`, extract generation results from `resultJson`



\## Error Codes



| Status Code | Description |

|-------------|-------------|

| 200 | Request successful |

| 400 | Invalid request parameters |

| 401 | Authentication failed, please check API Key |

| 402 | Insufficient account balance |

| 404 | Resource not found |

| 422 | Parameter validation failed |

| 429 | Request rate limit exceeded |

| 500 | Internal server error |





# \# Text To Dialogue V3 API Documentation - Post



> Generate content using the Text To Dialogue V3 model



\## Overview



This document describes how to use the Text To Dialogue V3 model for content generation. The process consists of two steps:

1\. Create a generation task

2\. Query task status and results



\## Authentication



All API requests require a Bearer Token in the request header:



```

Authorization: Bearer YOUR\_API\_KEY

```



Get API Key:

1\. Visit \[API Key Management Page](https://kie.ai/api-key) to get your API Key

2\. Add to request header: `Authorization: Bearer YOUR\_API\_KEY`



---



\## 1. Create Generation Task



\### API Information

\- \*\*URL\*\*: `POST https://api.kie.ai/api/v1/jobs/createTask`

\- \*\*Content-Type\*\*: `application/json`



\### Request Parameters



| Parameter | Type | Required | Description |

|-----------|------|----------|-------------|

| model | string | Yes | Model name, format: `elevenlabs/text-to-dialogue-v3` |

| input | object | Yes | Input parameters object |

| callBackUrl | string | No | Callback URL for task completion notifications. If provided, the system will send POST requests to this URL when the task completes (success or fail). If not provided, no callback notifications will be sent. Example: `"https://your-domain.com/api/callback"` |



\### Model Parameter



The `model` parameter specifies which AI model to use for content generation.



| Property | Value | Description |

|----------|-------|-------------|

| \*\*Format\*\* | `elevenlabs/text-to-dialogue-v3` | The exact model identifier for this API |

| \*\*Type\*\* | string | Must be passed as a string value |

| \*\*Required\*\* | Yes | This parameter is mandatory for all requests |



> \*\*Note\*\*: The model parameter must match exactly as shown above. Different models have different capabilities and parameter requirements.



\### Callback URL Parameter



The `callBackUrl` parameter allows you to receive automatic notifications when your task completes.



| Property | Value | Description |

|----------|-------|-------------|

| \*\*Purpose\*\* | Task completion notification | Receive real-time updates when your task finishes |

| \*\*Method\*\* | POST request | The system sends POST requests to your callback URL |

| \*\*Timing\*\* | When task completes | Notifications sent for both success and failure states |

| \*\*Content\*\* | Query Task API response | Callback content structure is identical to the Query Task API response |

| \*\*Parameters\*\* | Complete request data | The `param` field contains the complete Create Task request parameters, not just the input section |

| \*\*Optional\*\* | Yes | If not provided, no callback notifications will be sent |



\*\*Important Notes:\*\*

\- The callback content structure is identical to the Query Task API response

\- The `param` field contains the complete Create Task request parameters, not just the input section  

\- If `callBackUrl` is not provided, no callback notifications will be sent



\### input Object Parameters



\#### stability

\- \*\*Type\*\*: `number`

\- \*\*Required\*\*: No

\- \*\*Description\*\*: Determines how stable the voice is and the randomness between each generation.

\- \*\*Range\*\*: 0 - 1 (step: 0.5)

\- \*\*Default Value\*\*: `0.5`



\#### language\_code

\- \*\*Type\*\*: `string`

\- \*\*Required\*\*: No

\- \*\*Description\*\*: Select description

\- \*\*Options\*\*:

&nbsp; - `auto`: Auto

&nbsp; - `af`: Afrikaans

&nbsp; - `ar`: Arabic

&nbsp; - `hy`: Armenian

&nbsp; - `as`: Assamese

&nbsp; - `az`: Azerbaijani

&nbsp; - `be`: Belarusian

&nbsp; - `bn`: Bengali

&nbsp; - `bs`: Bosnian

&nbsp; - `bg`: Bulgarian

&nbsp; - `ca`: Catalan

&nbsp; - `ceb`: Cebuano

&nbsp; - `ny`: Chichewa

&nbsp; - `hr`: Croatian

&nbsp; - `cs`: Czech

&nbsp; - `da`: Danish

&nbsp; - `nl`: Dutch

&nbsp; - `en`: English

&nbsp; - `et`: Estonian

&nbsp; - `fil`: Filipino

&nbsp; - `fi`: Finnish

&nbsp; - `fr`: French

&nbsp; - `gl`: Galician

&nbsp; - `ka`: Georgian

&nbsp; - `de`: German

&nbsp; - `el`: Greek

&nbsp; - `gu`: Gujarati

&nbsp; - `ha`: Hausa

&nbsp; - `he`: Hebrew

&nbsp; - `hi`: Hindi

&nbsp; - `hu`: Hungarian

&nbsp; - `is`: Icelandic

&nbsp; - `id`: Indonesian

&nbsp; - `ga`: Irish

&nbsp; - `it`: Italian

&nbsp; - `ja`: Japanese

&nbsp; - `jv`: Javanese

&nbsp; - `kn`: Kannada

&nbsp; - `kk`: Kazakh

&nbsp; - `ky`: Kirghiz

&nbsp; - `ko`: Korean

&nbsp; - `lv`: Latvian

&nbsp; - `ln`: Lingala

&nbsp; - `lt`: Lithuanian

&nbsp; - `lb`: Luxembourgish

&nbsp; - `mk`: Macedonian

&nbsp; - `ms`: Malay

&nbsp; - `ml`: Malayalam

&nbsp; - `zh`: Mandarin Chinese

&nbsp; - `mr`: Marathi

&nbsp; - `ne`: Nepali

&nbsp; - `no`: Norwegian

&nbsp; - `ps`: Pashto

&nbsp; - `fa`: Persian

&nbsp; - `pl`: Polish

&nbsp; - `pt`: Portuguese

&nbsp; - `pa`: Punjabi

&nbsp; - `ro`: Romanian

&nbsp; - `ru`: Russian

&nbsp; - `sr`: Serbian

&nbsp; - `sd`: Sindhi

&nbsp; - `sk`: Slovak

&nbsp; - `sl`: Slovenian

&nbsp; - `so`: Somali

&nbsp; - `es`: Spanish

&nbsp; - `sw`: Swahili

&nbsp; - `sv`: Swedish

&nbsp; - `ta`: Tamil

&nbsp; - `te`: Telugu

&nbsp; - `th`: Thai

&nbsp; - `tr`: Turkish

&nbsp; - `uk`: Ukrainian

&nbsp; - `ur`: Urdu

&nbsp; - `vi`: Vietnamese

&nbsp; - `cy`: Welsh

\- \*\*Default Value\*\*: `"auto"`



\### Request Example



```json

{

&nbsp; "model": "elevenlabs/text-to-dialogue-v3",

&nbsp; "input": {

&nbsp;   "stability": 0.5,

&nbsp;   "language\_code": "auto"

&nbsp; }

}

```

\### Response Example



```json

{

&nbsp; "code": 200,

&nbsp; "msg": "success",

&nbsp; "data": {

&nbsp;   "taskId": "281e5b0\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*f39b9"

&nbsp; }

}

```



\### Response Parameters



| Parameter | Type | Description |

|-----------|------|-------------|

| code | integer | Response status code, 200 indicates success |

| msg | string | Response message |

| data.taskId | string | Task ID for querying task status |



---



\## 2. Query Task Status



\### API Information

\- \*\*URL\*\*: `GET https://api.kie.ai/api/v1/jobs/recordInfo`

\- \*\*Parameter\*\*: `taskId` (passed via URL parameter)



\### Request Example

```

GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId=281e5b0\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*f39b9

```



\### Response Example



```json

{

&nbsp; "code": 200,

&nbsp; "msg": "success",

&nbsp; "data": {

&nbsp;   "taskId": "281e5b0\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*\*f39b9",

&nbsp;   "model": "elevenlabs/text-to-dialogue-v3",

&nbsp;   "state": "waiting",

&nbsp;   "param": "{\\"model\\":\\"elevenlabs/text-to-dialogue-v3\\",\\"input\\":{\\"stability\\":0.5,\\"language\_code\\":\\"auto\\"}}",

&nbsp;   "resultJson": "",

&nbsp;   "failCode": null,

&nbsp;   "failMsg": null,

&nbsp;   "costTime": null,

&nbsp;   "completeTime": null,

&nbsp;   "createTime": 1757584164490

&nbsp; }

}

```



\### Response Parameters



| Parameter | Type | Description |

|-----------|------|-------------|

| code | integer | Response status code, 200 indicates success |

| msg | string | Response message |

| data.taskId | string | Task ID |

| data.model | string | Model name used |

| data.state | string | Task status: `waiting`(waiting),  `success`(success), `fail`(fail) |

| data.param | string | Task parameters (JSON string) |

| data.resultJson | string | Task result (JSON string, available when task is success). Structure depends on outputMediaType: `{resultUrls: \[]}` for image/media/video, `{resultObject: {}}` for text |

| data.failCode | string | Failure code (available when task fails) |

| data.failMsg | string | Failure message (available when task fails) |

| data.costTime | integer | Task duration in milliseconds (available when task is success) |

| data.completeTime | integer | Completion timestamp (available when task is success) |

| data.createTime | integer | Creation timestamp |



---



\## Usage Flow



1\. \*\*Create Task\*\*: Call `POST https://api.kie.ai/api/v1/jobs/createTask` to create a generation task

2\. \*\*Get Task ID\*\*: Extract `taskId` from the response

3\. \*\*Wait for Results\*\*: 

&nbsp;  - If you provided a `callBackUrl`, wait for the callback notification

&nbsp;  - If no `callBackUrl`, poll status by calling `GET https://api.kie.ai/api/v1/jobs/recordInfo`

4\. \*\*Get Results\*\*: When `state` is `success`, extract generation results from `resultJson`



\## Error Codes



| Status Code | Description |

|-------------|-------------|

| 200 | Request successful |

| 400 | Invalid request parameters |

| 401 | Authentication failed, please check API Key |

| 402 | Insufficient account balance |

| 404 | Resource not found |

| 422 | Parameter validation failed |

| 429 | Request rate limit exceeded |

| 500 | Internal server error |











