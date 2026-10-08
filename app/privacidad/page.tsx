import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacidad de solicitudes | MetaBot CR",
  description: "Cómo se utilizan los datos enviados desde el formulario comercial de MetaBot CR.",
};

export default function PrivacyPage() {
  return (
    <main style={{maxWidth: 760, margin:"0 auto", padding:"40px 22px",lineHeight:1.65}}>
      <p><Link href="/">← Volver a MetaBot CR</Link></p>
      <h1>Privacidad de solicitudes de contacto</h1>
      <p>Esta información se aplica al formulario de solicitud comercial de MetaBot CR.
        No sustituye las condiciones de privacidad que corresponderán a futuras cuentas de negocios.</p>
      <h2>Información recopilada</h2>
      <p>Nombre, correo, teléfono si lo proporcionás, nombre y sector de tu negocio,
        servicio de interés, mensaje y fecha de consentimiento. No solicitamos contraseñas,
        datos bancarios ni información de clientes de tu negocio.</p>
      <h2>Finalidad</h2>
      <p>Utilizamos los datos para identificar la solicitud, evaluar si podemos atenderla
        y responderte sobre los servicios consultados. Enviar el formulario no supone
        contratación ni inscripción en campañas masivas.</p>
      <h2>Conservación y acceso</h2>
      <p>Los registros se guardan en una base de datos de MetaBot CR. Solo personal
        autorizado para la operación comercial debe consultar estas solicitudes.
        Los plazos de conservación y eliminación automática deben formalizarse
        antes del lanzamiento comercial completo. Podés solicitar la eliminación
        de tus datos; la atención está sujeta a las obligaciones legales aplicables.</p>
      <h2>Proveedores y transferencias</h2>
      <p>El alojamiento y la base de datos pueden operar mediante proveedores
        tecnológicos externos. Esta página no implica que MetaBot CR esté afiliado
        a Meta Platforms ni que tu formulario contacte a WhatsApp automáticamente.</p>
      <h2>Rectificación y eliminación</h2>
      <p>Para preguntar por una solicitud, corregir tus datos o pedir que se eliminen,
        utilizá el <Link href="/#contacto">formulario de contacto</Link> e indicá
        &quot;PRIVACIDAD&quot; en el mensaje. Esta vía estará disponible cuando se habilite
        la recepción de solicitudes.</p>
      <p><small>Documento informativo preliminar. Requiere revisión jurídica
        para el mercado y los proveedores reales antes del lanzamiento público.</small></p>
    </main>
  );
}
