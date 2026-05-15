import java.lang.reflect.Constructor;
public class Inspect {
    public static void main(String[] args) throws Exception {
        Class<?> clazz = Class.forName("org.springframework.security.authentication.dao.DaoAuthenticationProvider");
        for (Constructor<?> c : clazz.getConstructors()) {
            System.out.println(c);
        }
    }
}
