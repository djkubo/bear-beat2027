import { CreditCard, Mail, Download, Sparkles } from 'lucide-react'

export function HowItWorks() {
  const steps = [
    {
      icon: CreditCard,
      number: '1️⃣',
      title: 'PAGAS',
      subtitle: '$350 pesos',
      description: 'Tarjeta, PayPal, OXXO o transferencia',
      color: 'text-bear-blue',
    },
    {
      icon: Mail,
      number: '2️⃣',
      title: 'RECIBES ACCESO',
      subtitle: 'Al instante',
      description: 'Email + WhatsApp con tu usuario y contraseña',
      color: 'text-bear-blue',
    },
    {
      icon: Download,
      number: '3️⃣',
      title: 'DESCARGAS',
      subtitle: 'Todo el pack',
      description: 'Por internet o con FileZilla',
      color: 'text-bear-blue',
    },
    {
      icon: Sparkles,
      number: '4️⃣',
      title: '¡LISTO!',
      subtitle: 'Ya los tienes',
      description: 'Úsalos en tus fiestas',
      color: 'text-bear-blue',
    },
  ]

  return (
    <section id="como-funciona" className="py-20 px-4 bg-secondary/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-extrabold mb-4">
            ¿Cómo funciona?
          </h2>
          <p className="text-2xl font-bold text-bear-blue">
            4 pasos súper fáciles 👇
          </p>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connection line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-bear-blue/50 to-transparent" />
              )}

              <div className="text-center space-y-4 relative bg-card rounded-2xl p-6 shadow-xl border-2 border-bear-blue/30 hover:border-bear-blue/60 transition-all hover:scale-105">
                {/* Step number BIG */}
                <div className="text-6xl mb-2">
                  {step.number}
                </div>
                
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-bear-blue/10 border-2 border-bear-blue/50 shadow-lg">
                  <step.icon className={`h-10 w-10 ${step.color}`} />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-extrabold">{step.title}</h3>
                  <p className="text-lg font-bold text-bear-blue">
                    {step.subtitle}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
