declare const chrome: any;
declare namespace chrome {
  namespace storage {
    interface StorageChange {
      oldValue?: any;
      newValue?: any;
    }
  }
}
export {};

