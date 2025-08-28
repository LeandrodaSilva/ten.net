export function log(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any[]) {
    console.log(`Calling method: ${propertyKey} with arguments: `, args);
    const result = originalMethod.apply(this, args);
    console.log(`Method ${propertyKey} returned: `, result);
    // promise resolve
    if (result instanceof Promise) {
      return result.then((resolvedResult) => {
        console.log(`Promise resolved with: `, resolvedResult);
        // Response resolve
        if (resolvedResult instanceof Response) {
          const clone = resolvedResult.clone();
          clone.text().then((text) => {
            console.log(`Response text: `, text);
          })
        }
        return resolvedResult;
      });
    }
    return result;
  };

  return descriptor;
}