"use client"
import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { WaitingRoomProduct } from '@/lib/types';

interface WaitRoomItem extends WaitingRoomProduct {
  quantity: number;
}

interface WaitRoomContextType {
  waitRoomItems: WaitRoomItem[];
  addToWaitRoom: (product: WaitingRoomProduct) => void;
  removeFromWaitRoom: (productId: string) => void;
  clearWaitRoom: () => void;
  waitRoomTotal: number;
  waitRoomCount: number;
}

const WaitRoomContext = createContext<WaitRoomContextType | undefined>(undefined);

export function WaitRoomProvider({ children }: { children: ReactNode }) {
  const [waitRoomItems, setWaitRoomItems] = useState<WaitRoomItem[]>([]);

  const addToWaitRoom = (product: WaitingRoomProduct) => {
    setWaitRoomItems(prevItems => {
      const itemExists = prevItems.find(item => item.id === product.id);
      if (itemExists) {
        return prevItems.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevItems, { ...product, quantity: 1 }];
    });
  };

  const removeFromWaitRoom = (productId: string) => {
    setWaitRoomItems(prevItems => prevItems.filter(item => item.id !== productId));
  };

  const clearWaitRoom = () => {
    setWaitRoomItems([]);
  };

  const waitRoomTotal = waitRoomItems.reduce((total, item) => total + item.price * item.quantity, 0);

  const waitRoomCount = waitRoomItems.reduce((count, item) => count + item.quantity, 0);

  return (
    <WaitRoomContext.Provider value={{ waitRoomItems, addToWaitRoom, removeFromWaitRoom, clearWaitRoom, waitRoomTotal, waitRoomCount }}>
      {children}
    </WaitRoomContext.Provider>
  );
}

export function useWaitRoom() {
  const context = useContext(WaitRoomContext);
  if (context === undefined) {
    throw new Error('useWaitRoom must be used within a WaitRoomProvider');
  }
  return context;
}
