import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, ChevronDown } from 'lucide-react';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  options?: string[];
}

const FAQ_DATA: Record<string, { answer: string; options?: string[] }> = {
  greeting: {
    answer: "¡Hola! Soy tu asistente virtual de Davivienda. ¿En qué puedo ayudarte hoy?",
    options: [
      "¿Cómo consulto mi saldo?",
      "¿Cómo hago una transferencia?",
      "¿Cómo pago mis servicios?",
      "Problemas con mi cuenta",
      "¿Cómo cambio mi contraseña?",
      "Hablar con un asesor"
    ]
  },
  "¿cómo consulto mi saldo?": {
    answer: "Para consultar su saldo:\n\n1. Ingrese a su cuenta con su usuario y contraseña.\n2. En la pantalla de Inicio verá sus cuentas y el saldo disponible.\n3. Toque cualquier cuenta para ver los detalles y movimientos recientes.",
    options: ["¿Cómo hago una transferencia?", "Volver al menú principal"]
  },
  "¿cómo hago una transferencia?": {
    answer: "Para realizar una transferencia:\n\n1. Toque \"Enviar\" en el menú inferior.\n2. Seleccione la cuenta de origen.\n3. Ingrese el número de cuenta destino o seleccione un beneficiario guardado.\n4. Ingrese el monto y una descripción.\n5. Confirme la transferencia.\n\nLas transferencias entre cuentas Davivienda son inmediatas.",
    options: ["¿Tiene algún costo?", "¿Cómo agrego un beneficiario?", "Volver al menú principal"]
  },
  "¿tiene algún costo?": {
    answer: "Las transferencias entre cuentas Davivienda no tienen costo. Las transferencias a otros bancos pueden tener un cargo según su tipo de cuenta. Consulte con su asesor para más detalles.",
    options: ["¿Cómo hago una transferencia?", "Volver al menú principal"]
  },
  "¿cómo agrego un beneficiario?": {
    answer: "Para agregar un beneficiario:\n\n1. Vaya a la sección \"Enviar\".\n2. Al hacer una transferencia, puede guardar el destinatario como beneficiario.\n3. La próxima vez que transfiera, podrá seleccionarlo directamente de su lista.",
    options: ["¿Cómo hago una transferencia?", "Volver al menú principal"]
  },
  "¿cómo pago mis servicios?": {
    answer: "Para pagar sus servicios:\n\n1. Toque \"Pagos\" en el menú inferior.\n2. Si tiene cargos pendientes, aparecerán en la lista.\n3. Seleccione el cargo que desea pagar.\n4. Siga las instrucciones para completar el pago.\n\nTambién puede escanear un código QR desde la sección QR.",
    options: ["¿Qué servicios puedo pagar?", "Volver al menú principal"]
  },
  "¿qué servicios puedo pagar?": {
    answer: "Puede pagar servicios públicos, telefonía, internet, televisión por cable, seguros y más. Los cargos pendientes asignados a su cuenta aparecerán automáticamente en la sección de Pagos.",
    options: ["¿Cómo pago mis servicios?", "Volver al menú principal"]
  },
  "problemas con mi cuenta": {
    answer: "Si tiene problemas con su cuenta, puede intentar lo siguiente:\n\n• Si no puede iniciar sesión, use la opción \"¿Olvidó su contraseña?\" en la pantalla de ingreso.\n• Si su cuenta aparece bloqueada, contacte a nuestro servicio al cliente.\n• Si ve movimientos que no reconoce, repórtelo inmediatamente.\n\n¿Qué problema específico tiene?",
    options: ["No puedo iniciar sesión", "Movimientos no reconocidos", "Hablar con un asesor", "Volver al menú principal"]
  },
  "no puedo iniciar sesión": {
    answer: "Si no puede iniciar sesión:\n\n1. Verifique que su usuario y contraseña sean correctos.\n2. Asegúrese de no tener activado el bloqueo de mayúsculas.\n3. Si olvidó su contraseña, use la opción de recuperación en la pantalla de inicio.\n4. Si el problema persiste, contacte a servicio al cliente.\n\nRecuerde: nunca comparta su contraseña con nadie.",
    options: ["¿Cómo cambio mi contraseña?", "Hablar con un asesor", "Volver al menú principal"]
  },
  "movimientos no reconocidos": {
    answer: "ALERTA - Si detecta movimientos que no reconoce:\n\n1. No entre en pánico.\n2. Revise detalladamente cada movimiento en su historial.\n3. Contacte inmediatamente a nuestro servicio al cliente.\n4. Es posible que necesite bloquear temporalmente su cuenta.\n\nSu seguridad es nuestra prioridad.",
    options: ["Hablar con un asesor", "Volver al menú principal"]
  },
  "¿cómo cambio mi contraseña?": {
    answer: "Para cambiar su contraseña:\n\n1. Inicie sesión en su cuenta.\n2. Vaya a la sección \"Perfil\".\n3. Seleccione \"Cambiar contraseña\".\n4. Ingrese su contraseña actual y la nueva contraseña.\n5. La nueva contraseña debe tener al menos 6 caracteres.\n\nRecuerde usar una contraseña segura que combine letras y números.",
    options: ["Problemas con mi cuenta", "Volver al menú principal"]
  },
  "hablar con un asesor": {
    answer: "Para hablar con un asesor:\n\n• Puede llamar a nuestra línea de atención al cliente desde la app tocando el ícono de teléfono.\n• También puede escribirnos por WhatsApp.\n• Nuestros asesores están disponibles para ayudarle.\n\nEncuentre estas opciones en la pantalla de inicio o en su perfil.",
    options: ["Volver al menú principal"]
  },
  "¿cómo uso el código qr?": {
    answer: "Para usar el código QR:\n\n1. Toque \"QR\" en el menú central.\n2. Puede escanear un código QR para realizar pagos.\n3. También puede generar su propio código QR para recibir dinero.\n\nEs una forma rápida y segura de hacer transacciones.",
    options: ["¿Cómo hago una transferencia?", "Volver al menú principal"]
  },
  "¿es segura la app?": {
    answer: "Sí, Davivienda Móvil cuenta con múltiples capas de seguridad:\n\n• Cifrado de datos en tránsito.\n• Sesiones protegidas con tiempo de expiración.\n• Nunca almacenamos su contraseña en texto plano.\n\nRecomendaciones:\n• No comparta sus credenciales.\n• Use contraseñas fuertes.\n• Cierre sesión al terminar.",
    options: ["¿Cómo cambio mi contraseña?", "Volver al menú principal"]
  }
};

function findAnswer(input: string): { answer: string; options?: string[] } {
  const normalized = input.toLowerCase().trim();

  if (normalized === "volver al menú principal" || normalized === "menu" || normalized === "inicio") {
    return FAQ_DATA["greeting"];
  }

  if (FAQ_DATA[normalized]) {
    return FAQ_DATA[normalized];
  }

  const keywords: Record<string, string[]> = {
    "¿cómo consulto mi saldo?": ["saldo", "consultar", "cuánto tengo", "balance", "disponible"],
    "¿cómo hago una transferencia?": ["transferencia", "transferir", "enviar dinero", "enviar plata"],
    "¿cómo pago mis servicios?": ["pagar", "pago", "servicio", "factura", "recibo"],
    "problemas con mi cuenta": ["problema", "error", "bloqueada", "bloqueo", "no funciona"],
    "¿cómo cambio mi contraseña?": ["contraseña", "clave", "password", "cambiar clave"],
    "hablar con un asesor": ["asesor", "agente", "humano", "persona", "llamar", "contacto", "ayuda"],
    "¿cómo uso el código qr?": ["qr", "código qr", "escanear"],
    "¿es segura la app?": ["segura", "seguridad", "confiable", "hackeo", "fraude"],
    "no puedo iniciar sesión": ["no puedo entrar", "no entra", "login", "iniciar sesión"],
    "movimientos no reconocidos": ["no reconozco", "movimiento extraño", "robo", "fraude"]
  };

  for (const [faqKey, words] of Object.entries(keywords)) {
    if (words.some(w => normalized.includes(w))) {
      return FAQ_DATA[faqKey];
    }
  }

  return {
    answer: "No encontré información sobre eso. Le sugiero revisar estas opciones o contactar a un asesor para ayuda personalizada.",
    options: [
      "¿Cómo consulto mi saldo?",
      "¿Cómo hago una transferencia?",
      "Problemas con mi cuenta",
      "Hablar con un asesor",
      "Volver al menú principal"
    ]
  };
}

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      addBotMessage(FAQ_DATA["greeting"].answer, FAQ_DATA["greeting"].options);
    }
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const addBotMessage = (text: string, options?: string[]) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: ++idRef.current,
        text,
        sender: 'bot',
        timestamp: new Date(),
        options
      }]);
    }, 600);
  };

  const handleSend = (text?: string) => {
    const msg = text || inputText.trim();
    if (!msg) return;

    setMessages(prev => [...prev, {
      id: ++idRef.current,
      text: msg,
      sender: 'user',
      timestamp: new Date()
    }]);
    setInputText('');

    const result = findAnswer(msg);
    addBotMessage(result.answer, result.options);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          data-testid="button-open-chatbot"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-24 right-4 z-50 w-14 h-14 bg-[#D50000] text-white rounded-full shadow-xl flex items-center justify-center hover:bg-red-700 active:scale-95 transition-all"
        >
          <MessageCircle size={26} />
        </button>
      )}

      {isOpen && (
        <div
          data-testid="chatbot-window"
          className="fixed inset-0 z-50 flex flex-col bg-gray-100"
          style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="bg-[#D50000] text-white px-4 py-3 flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Bot size={22} />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Asistente Davivienda</h3>
                <p className="text-xs text-white/80">En línea</p>
              </div>
            </div>
            <button
              data-testid="button-close-chatbot"
              onClick={() => setIsOpen(false)}
              className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id}>
                <div className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.sender === 'bot' && (
                    <div className="w-7 h-7 bg-[#D50000] rounded-full flex items-center justify-center mr-2 shrink-0 mt-1">
                      <Bot size={14} className="text-white" />
                    </div>
                  )}
                  <div
                    data-testid={`chat-message-${msg.id}`}
                    className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                      msg.sender === 'user'
                        ? 'bg-[#D50000] text-white rounded-br-md'
                        : 'bg-white text-gray-800 rounded-bl-md shadow-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                  {msg.sender === 'user' && (
                    <div className="w-7 h-7 bg-gray-300 rounded-full flex items-center justify-center ml-2 shrink-0 mt-1">
                      <User size={14} className="text-gray-600" />
                    </div>
                  )}
                </div>

                {msg.options && msg.sender === 'bot' && (
                  <div className="ml-9 mt-2 flex flex-wrap gap-2">
                    {msg.options.map((option, idx) => (
                      <button
                        key={idx}
                        data-testid={`button-option-${msg.id}-${idx}`}
                        onClick={() => handleSend(option)}
                        className="text-xs bg-white border border-red-200 text-[#D50000] px-3 py-1.5 rounded-full hover:bg-red-50 active:bg-red-100 transition-colors shadow-sm"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex justify-start">
                <div className="w-7 h-7 bg-[#D50000] rounded-full flex items-center justify-center mr-2 shrink-0">
                  <Bot size={14} className="text-white" />
                </div>
                <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-md shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="bg-white border-t border-gray-200 px-3 py-2 shrink-0 flex items-center gap-2">
            <input
              ref={inputRef}
              data-testid="input-chatbot-message"
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escriba su pregunta..."
              className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-200 border-0"
            />
            <button
              data-testid="button-send-chatbot"
              onClick={() => handleSend()}
              disabled={!inputText.trim()}
              className="w-10 h-10 bg-[#D50000] text-white rounded-full flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all shrink-0"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
