import { useState,useEffect } from 'react';
export function useLocalStorage(key,initial) {
  const [value,setValue]=useState(()=>{try{const saved=JSON.parse(localStorage.getItem(key));return saved===null?initial:saved;}catch{return initial;}});
  useEffect(()=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{/* Private browsing or storage quota: keep working in memory. */}},[key,value]);
  return [value,setValue];
}
