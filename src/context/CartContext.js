import { createContext, useContext, useState } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [items, setItems] = useState([]); // {eventId, eventName, ticketTypeName, unitPrice, quantity}

  function addItem(item) {
    setItems(prev => {
      const idx = prev.findIndex(p => p.eventId === item.eventId && p.ticketTypeName === item.ticketTypeName);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + item.quantity };
        return copy;
      }
      return [...prev, item];
    });
  }

  function removeItem(index) {
    setItems(prev => prev.filter((_, i) => i !== index));
  }

  function setQuantity(index, qty){
    setItems(prev => prev.map((it, i)=> i===index ? { ...it, quantity: Math.max(0, Number(qty)||0) } : it).filter(it=>it.quantity>0));
  }
  function increase(index){ setQuantity(index, (items[index]?.quantity||0)+1); }
  function decrease(index){ setQuantity(index, (items[index]?.quantity||0)-1); }

  function clear() { setItems([]); }

  const total = items.reduce((a, it) => a + it.unitPrice * it.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clear, total, setQuantity, increase, decrease }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() { return useContext(CartContext); }
