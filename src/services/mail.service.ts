import { emit } from 'process';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'onboarding@resend.dev'


export const sendMail = (email:string, subject:string, content:string) => {
    resend.emails.send({
        from: FROM,
        to: email,
        subject: subject,
        html: `<p>${content}</p>`
    });
}