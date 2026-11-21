Class Demo.FormatDemo Extends %RegisteredObject
{
   ClassMethod Sum(n As %Integer) As %Integer
   {
 set total=0
 for i=1:1:n {
   set total=total+i
 }
 quit total
   }
}
