export type JsonResponse<
  Operation extends { responses: object },
  Status extends keyof Operation['responses'],
> = Operation['responses'][Status] extends {
  content: { 'application/json': infer Body };
}
  ? Body
  : never;

export type JsonRequestBody<Operation extends { requestBody?: unknown }> =
  Operation['requestBody'] extends {
    content: { 'application/json': infer Body };
  }
    ? Body
    : never;
