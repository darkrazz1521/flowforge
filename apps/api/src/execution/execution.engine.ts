import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

type JsonPrimitive = string | number | boolean | null;

type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

@Injectable()
export class ExecutionEngine {
  async executeNode(
    node: {
      id: number;
      name: string;
      type: string;
      config: unknown;
    },
    payload: JsonValue,
  ): Promise<JsonValue> {
    switch (node.type) {
      case 'TASK':
        return this.executeTask(node, payload);

      case 'HTTP':
        return this.executeHttp(node, payload);

      case 'DELAY':
        return this.executeDelay(node, payload);

      case 'CONDITION':
        return this.executeCondition(node, payload);

      default:
        throw new BadRequestException(
          `Unsupported node type: ${node.type}`,
        );
    }
  }

  private getConfig(
    config: unknown,
  ): Record<string, unknown> {
    if (
      config &&
      typeof config === 'object' &&
      !Array.isArray(config)
    ) {
      return config as Record<string, unknown>;
    }

    return {};
  }

  private async executeTask(
    node: {
      id: number;
      name: string;
      type: string;
      config: unknown;
    },
    payload: JsonValue,
  ): Promise<JsonValue> {
    const config = this.getConfig(node.config);

    return {
      message: 'Task executed successfully',
      nodeId: node.id,
      nodeName: node.name,
      task: this.toJsonValue(config.task),
      input: payload,
    };
  }

  private async executeHttp(
    node: {
      id: number;
      name: string;
      type: string;
      config: unknown;
    },
    payload: JsonValue,
  ): Promise<JsonValue> {
    const config = this.getConfig(node.config);

    const url = config.url;

    if (
      typeof url !== 'string' ||
      url.length === 0
    ) {
      throw new BadRequestException(
        `HTTP node ${node.id} requires a valid config.url`,
      );
    }

    const method =
      typeof config.method === 'string'
        ? config.method.toUpperCase()
        : 'GET';

    const allowedMethods = [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
    ];

    if (!allowedMethods.includes(method)) {
      throw new BadRequestException(
        `Unsupported HTTP method: ${method}`,
      );
    }

    const headers: Record<string, string> = {};

    if (
      config.headers &&
      typeof config.headers === 'object' &&
      !Array.isArray(config.headers)
    ) {
      for (const [key, value] of Object.entries(
        config.headers as Record<string, unknown>,
      )) {
        if (typeof value === 'string') {
          headers[key] = value;
        }
      }
    }

    const requestOptions: RequestInit = {
      method,
      headers,
    };

    if (
      method !== 'GET' &&
      method !== 'DELETE'
    ) {
      headers['Content-Type'] =
        headers['Content-Type'] ??
        'application/json';

      requestOptions.body = JSON.stringify(
        this.toJsonValue(
          config.body ?? payload,
        ),
      );
    }

    const response = await fetch(
      url,
      requestOptions,
    );

    const contentType =
      response.headers.get('content-type') ?? '';

    let data: JsonValue;

    if (
      contentType.includes(
        'application/json',
      )
    ) {
      data =
        (await response.json()) as JsonValue;
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      throw new BadRequestException(
        `HTTP request failed with status ${response.status}`,
      );
    }

    return {
      message:
        'HTTP request executed successfully',
      nodeId: node.id,
      nodeName: node.name,
      status: response.status,
      statusText: response.statusText,
      data,
    };
  }

  private async executeDelay(
    node: {
      id: number;
      name: string;
      type: string;
      config: unknown;
    },
    payload: JsonValue,
  ): Promise<JsonValue> {
    const config = this.getConfig(node.config);

    const delay =
      typeof config.delay === 'number'
        ? config.delay
        : typeof config.ms === 'number'
          ? config.ms
          : 1000;

    if (
      delay < 0 ||
      delay > 30000
    ) {
      throw new BadRequestException(
        'Delay must be between 0 and 30000 milliseconds',
      );
    }

    await new Promise<void>(
      (resolve) => {
        setTimeout(resolve, delay);
      },
    );

    return {
      message:
        'Delay completed successfully',
      nodeId: node.id,
      nodeName: node.name,
      delay,
      input: payload,
    };
  }

  private async executeCondition(
    node: {
      id: number;
      name: string;
      type: string;
      config: unknown;
    },
    payload: JsonValue,
  ): Promise<JsonValue> {
    const config = this.getConfig(node.config);

    const field = config.field;

    if (
      typeof field !== 'string' ||
      field.length === 0
    ) {
      throw new BadRequestException(
        `Condition node ${node.id} requires config.field`,
      );
    }

    const operator =
      typeof config.operator === 'string'
        ? config.operator
        : 'equals';

    const expected =
      this.toJsonValue(config.value);

    const actual =
      this.getNestedValue(
        payload,
        field,
      );

    let condition = false;

    switch (operator) {
      case 'equals':
      case '==':
        condition = actual === expected;
        break;

      case 'not_equals':
      case '!=':
        condition = actual !== expected;
        break;

      case 'exists':
        condition =
          actual !== undefined &&
          actual !== null;
        break;

      case 'not_exists':
        condition =
          actual === undefined ||
          actual === null;
        break;

      case 'contains':
        condition =
          typeof actual === 'string' &&
          typeof expected === 'string' &&
          actual.includes(expected);
        break;

      case 'greater_than':
      case '>':
        condition =
          typeof actual === 'number' &&
          typeof expected === 'number' &&
          actual > expected;
        break;

      case 'less_than':
      case '<':
        condition =
          typeof actual === 'number' &&
          typeof expected === 'number' &&
          actual < expected;
        break;

      default:
        throw new BadRequestException(
          `Unsupported condition operator: ${operator}`,
        );
    }

    return {
      message:
        'Condition evaluated successfully',
      nodeId: node.id,
      nodeName: node.name,
      field,
      operator,
      expected,
      actual:
        actual === undefined
          ? null
          : this.toJsonValue(actual),
      condition,
      input: payload,
    };
  }

  private getNestedValue(
    payload: JsonValue,
    path: string,
  ): unknown {
    return path
      .split('.')
      .reduce<unknown>(
        (current, key) => {
          if (
            current !== null &&
            typeof current === 'object' &&
            !Array.isArray(current)
          ) {
            return (
              current as Record<
                string,
                JsonValue
              >
            )[key];
          }

          return undefined;
        },
        payload,
      );
  }

  private toJsonValue(
    value: unknown,
  ): JsonValue {
    if (value === null) {
      return null;
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) =>
        this.toJsonValue(item),
      );
    }

    if (
      typeof value === 'object'
    ) {
      const result: {
        [key: string]: JsonValue;
      } = {};

      for (const [key, item] of Object.entries(
        value as Record<string, unknown>,
      )) {
        result[key] =
          this.toJsonValue(item);
      }

      return result;
    }

    return null;
  }
}