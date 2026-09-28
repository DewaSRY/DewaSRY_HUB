### Success pageinate response Response

```json
{
  "data": [],
  "code": 200,
  "message": "Success retrieve list",
  "meta": {
    "total": 200,
    "page": 1,
    "limit": 20,
    "total_page": 20
  }
}
```

- data: List object
- code: Http Code response
- message: Message text
- meta.total: total of data match the request
- meta.page: current page postion
- meta.limit: limit amount requested
- meta.total_page: amount of page requested

### Success response Response

```json
{
  "data": {},
  "code": 200,
  "message": "Success retrieve list"
}
```

- data: Data can be single object
- code: Http Code response
- message: Message text

### Error response

```json
{
  "code": 404,
  "message": "failed to get the data",
  "error": [
    {
      "field": "name",
      "message": "name requested is to long"
    }
  ]
}
```

- code: Http Code response
- message: Message text
- error[0].fied: field of requested
- error[0].message: Error message
