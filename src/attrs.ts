/**
 * Single source of truth for every gg-* attribute the library reads or writes.
 * Engines should reference these constants instead of inline string literals so
 * the attribute vocabulary stays discoverable and renameable.
 */
export const ATTR = {
  // Actions
  action: "gg-action",
  actionData: "gg-action-data",
  formAction: "gg-form-action",

  // Data binding
  data: "gg-data",
  dataList: "gg-data-list",
  dataForm: "gg-data-form",
  dataOn: "gg-data-on",
  field: "gg-field",
  listTemplate: "gg-list-template",

  // Form errors
  formFieldError: "gg-form-field-error",
  formFieldInvalid: "gg-form-field-invalid",
  formError: "gg-form-error",
  formErrorList: "gg-form-error-list",
  formScope: "gg-form-scope",

  // Switcher
  switchState: "gg-switch-state",
  switchField: "gg-switch-field",
  switchQuery: "gg-switch-query",
  case: "gg-case",

  // Visibility
  visibleWhen: "gg-visible-when",

  // URL params
  queryBind: "gg-query-bind",
  queryDebounce: "gg-query-debounce",
  querySet: "gg-query-set",
  queryRemove: "gg-query-remove",

  // Status
  loading: "gg-loading",
  confirm: "gg-confirm",
  confirmText: "gg-confirm-text",
  auth: "gg-auth",
  role: "gg-role",
} as const;

export const SEL = {
  action: `[${ATTR.action}]`,
  formAction: `form[${ATTR.formAction}]`,
  data: `[${ATTR.data}]`,
  dataList: `[${ATTR.dataList}]`,
  dataForm: `[${ATTR.dataForm}]`,
  dataAny: `[${ATTR.data}], [${ATTR.dataList}], [${ATTR.dataForm}]`,
  field: `[${ATTR.field}]`,
  listTemplate: `[${ATTR.listTemplate}]`,
  switchState: `[${ATTR.switchState}]`,
  switchField: `[${ATTR.switchField}]`,
  switchQuery: `[${ATTR.switchQuery}]`,
  visibleWhen: `[${ATTR.visibleWhen}]`,
  queryBind: `[${ATTR.queryBind}]`,
  formScopeOrForm: `[${ATTR.formScope}], form`,
  formFieldInvalid: `[${ATTR.formFieldInvalid}]`,
  formFieldError: `[${ATTR.formFieldError}]`,
  formError: `[${ATTR.formError}]`,
  formErrorList: `[${ATTR.formErrorList}]`,
  auth: `[${ATTR.auth}]`,
  role: `[${ATTR.role}]`,
} as const;
