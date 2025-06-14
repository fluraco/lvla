import React, { createContext, useContext, useReducer, ReactNode } from 'react';

interface Location {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

interface RegisterState {
  step: number;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  gender: string;
  interestedIn: string[];
  location?: Location;
  hobbies: string[];
  biography: string;
  birthDate?: Date;
  photos: {
    uri: string;
    orderIndex: number;
  }[];
  googleId?: string;
  email?: string;
  profilePhoto?: string;
  isGoogleSignup: boolean;
}

type RegisterAction =
  | { type: 'SET_PHONE_NUMBER'; payload: string }
  | { type: 'SET_NAMES'; payload: { firstName: string; lastName: string } }
  | { type: 'SET_GENDER'; payload: string }
  | { type: 'SET_INTERESTED_IN'; payload: string[] }
  | { type: 'SET_LOCATION'; payload: Location }
  | { type: 'SET_HOBBIES'; payload: string[] }
  | { type: 'SET_BIOGRAPHY'; payload: string }
  | { type: 'SET_BIRTH_DATE'; payload: Date }
  | { type: 'ADD_PHOTO'; payload: { uri: string; orderIndex: number } }
  | { type: 'REMOVE_PHOTO'; payload: string }
  | { type: 'REORDER_PHOTOS'; payload: { uri: string; orderIndex: number }[] }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'RESET' }
  | { type: 'SET_GOOGLE_USER'; payload: { 
      googleId: string; 
      email?: string; 
      firstName?: string; 
      lastName?: string; 
      profilePhoto?: string; 
    } };

const initialState: RegisterState = {
  step: 1,
  phoneNumber: '',
  firstName: '',
  lastName: '',
  gender: '',
  interestedIn: [],
  hobbies: [],
  biography: '',
  photos: [],
  isGoogleSignup: false,
};

function registerReducer(state: RegisterState, action: RegisterAction): RegisterState {
  switch (action.type) {
    case 'SET_PHONE_NUMBER':
      return { ...state, phoneNumber: action.payload };
    case 'SET_NAMES':
      return { ...state, ...action.payload };
    case 'SET_GENDER':
      return { ...state, gender: action.payload };
    case 'SET_INTERESTED_IN':
      return { ...state, interestedIn: action.payload };
    case 'SET_LOCATION':
      return { ...state, location: action.payload };
    case 'SET_HOBBIES':
      return { ...state, hobbies: action.payload };
    case 'SET_BIOGRAPHY':
      return { ...state, biography: action.payload };
    case 'SET_BIRTH_DATE':
      return { ...state, birthDate: action.payload };
    case 'ADD_PHOTO':
      return {
        ...state,
        photos: [...state.photos, action.payload].sort((a, b) => a.orderIndex - b.orderIndex),
      };
    case 'REMOVE_PHOTO':
      return {
        ...state,
        photos: state.photos
          .filter((photo) => photo.uri !== action.payload)
          .map((photo, index) => ({ ...photo, orderIndex: index })),
      };
    case 'REORDER_PHOTOS':
      return { ...state, photos: action.payload };
    case 'NEXT_STEP':
      return { ...state, step: state.step + 1 };
    case 'PREV_STEP':
      return { ...state, step: Math.max(1, state.step - 1) };
    case 'RESET':
      return initialState;
    case 'SET_GOOGLE_USER':
      return { 
        ...state, 
        googleId: action.payload.googleId,
        email: action.payload.email || '',
        firstName: action.payload.firstName || state.firstName,
        lastName: action.payload.lastName || state.lastName,
        profilePhoto: action.payload.profilePhoto || '',
        isGoogleSignup: true,
      };
    default:
      return state;
  }
}

interface RegisterContextType {
  state: RegisterState;
  dispatch: React.Dispatch<RegisterAction>;
}

const RegisterContext = createContext<RegisterContextType | undefined>(undefined);

export function RegisterProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(registerReducer, initialState);

  return (
    <RegisterContext.Provider value={{ state, dispatch }}>
      {children}
    </RegisterContext.Provider>
  );
}

export function useRegister() {
  const context = useContext(RegisterContext);
  if (context === undefined) {
    throw new Error('useRegister must be used within a RegisterProvider');
  }
  return context;
} 