import emailjs from "@emailjs/browser";

export async function sendWelcomeEmail(userEmail: string) {
  try {
    await emailjs.send(
      process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID!,
      process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_WELCOME!,
      {
        user_email: userEmail
      },
      process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY!
    );
  } catch (error) {
    console.error("EmailJS Error:", error);
  }
}
