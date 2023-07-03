export interface Product {
    id: string;
    title: string;
    price: number;
    autor: string;
  }
  
  export interface Stock {
    product_id: string;
    count: number;
  }