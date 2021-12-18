import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');
    if (storagedCart) {
      return JSON.parse(storagedCart);
    }
    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const stockProduct = await api.get(`stock/${productId}`);

      const isProductInList = cart.find(product => product.id === productId) ? true : false;

      if (!isProductInList) {
        await api.get(`products/${productId}`).then(response => {
          response.data.amount = 1;
          localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart, response.data]));
          setCart([...cart, response.data]);
        });
      } else {
        cart.forEach(product => {
          if (product.id === productId) {
            if (stockProduct.data.amount <= product.amount) {
              toast.error('Quantidade solicitada fora de estoque');
            } else {
              product.amount += 1;
              localStorage.setItem('@RocketShoes:cart', JSON.stringify([...cart]));
              setCart([...cart]);
            }
          }
        });
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const isProductInList = cart.find(product => product.id === productId) ? true : false;
      if (isProductInList) {
        const cartWithoutProduct = cart.filter(product => (product.id !== productId));
        setCart(cartWithoutProduct);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartWithoutProduct));
      } else {
        toast.error('Erro na remoção do produto');
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const stockProduct = await api.get(`stock/${productId}`);

      if (amount <= 0) {
        return;
      }
      if (amount >= stockProduct.data.amount) {
        toast.error('Quantidade solicitada fora de estoque');
      } else {
        cart.forEach(product => {
          if (product && product.id === productId) {
            product.amount = amount;
          }
        });
        setCart([...cart]);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
